# Movie Module Security Review & Threat Assessment

This document provides a security analysis of the **Movie Management Module**, assessing its resilience against the **OWASP Top 10 API Security Risks (2023)** and platform security standards.

---

## 1. OWASP API Security Threat Assessment

| OWASP API Risk | Assessment & Defense Strategy | Compliance Status |
| :--- | :--- | :---: |
| **API1:2023 Broken Object Level Authorization (BOLA / IDOR)** | Movie lookup by ID or slug enforces strict visibility rules. Public endpoints inject `{ status: { $in: PublicVisibleStatuses }, isDeleted: false }`. Even if an attacker guesses a draft movie's slug or ObjectId, a 404 is returned. | ✅ SECURE |
| **API2:2023 Broken Authentication** | Admin routes (`/api/v1/admin/movies/*`, `/genres/*`, `/languages/*`) require valid JWT bearer tokens verified against the centralized auth pipeline with token expiration and revocation checks. | ✅ SECURE |
| **API3:2023 Broken Object Property Level Authorization (Mass Assignment)** | Strict Zod input schemas strip or reject unauthorized fields. Critical attributes (`status`, `isDeleted`, `deletedAt`, `averageRating`, `totalVotes`) cannot be altered via generic create or update endpoints. | ✅ SECURE |
| **API4:2023 Unrestricted Resource Consumption** | Pagination limits are strictly clamped (max 100). Image payloads are capped at 5MB. Rate limiting middleware protects discovery and search endpoints from scraper abuse. | ✅ SECURE |
| **API5:2023 Broken Function Level Authorization (BFLA)** | Multi-level middleware checks (`authenticate` -> `requireRole` -> `requirePermission`). Privileges like `MOVIE_APPROVE` and `GENRE_MANAGE` are restricted exclusively to `SUPER_ADMIN` and `ADMIN`. | ✅ SECURE |
| **API6:2023 Server-Side Request Forgery (SSRF)** | The platform does not perform arbitrary server-side HTTP requests based on user-supplied URLs. Trailer URLs are strictly parsed via regex for whitelisted domains (YouTube and Vimeo). | ✅ SECURE |
| **API7:2023 Security Misconfiguration** | Helmet headers enabled, CORS restricted to whitelisted origins, verbose stack traces suppressed in production responses, standardized error codes. | ✅ SECURE |
| **API8:2023 Lack of Protection from Automated Threats** | Rate limiting applied to public search queries. Regex queries are escaped with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` to prevent Regular Expression Denial of Service (ReDoS). | ✅ SECURE |
| **API9:2023 Improper Inventory Management** | All endpoints are documented in Swagger/OpenAPI with schema definitions. Versioned routing (`/api/v1`) isolates legacy integrations. | ✅ SECURE |
| **API10:2023 Unsafe Consumption of APIs** | Cloudinary and external media integrations use pre-authenticated SDK methods and strictly validated asset identifiers. | ✅ SECURE |

---

## 2. NoSQL Injection Mitigation

To prevent NoSQL injection attacks where malicious query operators (`$gt`, `$ne`, `$where`) are injected into request parameters:
1. **Schema Validation**: All path parameters (`movieId`, `slug`, `genreId`) and query parameters (`search`, `genre`, `page`, `limit`) are validated by Zod before reaching controllers.
2. **Type Coercion**: Numeric fields are parsed to native numbers; string parameters are verified as primitive strings.
3. **Mongoose Parameterization**: All queries use parameterized Mongoose query builders without raw JavaScript execution (`$where` is strictly prohibited).

---

## 3. Mass Assignment Prevention Architecture

A common vulnerability in content management modules is allowing malicious callers to elevate movie status directly to `APPROVED` or set arbitrary `averageRating` scores during creation.

The `createMovieSchema` and `updateMovieSchema` strictly whitelist accepted properties:

```javascript
// Whitelisted input properties in movie.validation.js
export const createMovieSchema = z.object({
  title: z.string().min(1).max(255),
  originalTitle: z.string().max(255).optional(),
  synopsis: z.string().min(10).max(5000),
  genreIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
  languageIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
  censorRating: z.nativeEnum(CensorRating),
  durationMinutes: z.number().int().min(1).max(600),
  releaseDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  availableFormats: z.array(z.nativeEnum(MovieFormat)).min(1),
  posterUrl: z.string().url(),
  bannerUrl: z.string().url().optional(),
  trailerUrl: z.string().url().optional(),
  cast: z.array(castMemberSchema).optional(),
  crew: z.array(crewMemberSchema).optional()
  // NOTE: status, isDeleted, averageRating, totalVotes are EXCLUDED
});
```

Any attempt to supply `{ status: "APPROVED", averageRating: 5.0 }` is ignored or rejected by the validator.

---

## 4. Audit Logging & Non-Repudiation

All state changes on movie records trigger structured audit log entries via Winston:

1. **Movie Creation**: Logs `movieId`, author `userId`, initial status `DRAFT`, client IP.
2. **Movie Approval / Rejection**: Logs `movieId`, approving admin `userId`, transition timestamp, and rejection reason if applicable.
3. **Movie Soft Deletion**: Logs `movieId`, administrative `userId`, deletion timestamp, and client user-agent.
4. **Taxonomy Mutations**: Logs all alterations to genres and languages for administrative non-repudiation.

