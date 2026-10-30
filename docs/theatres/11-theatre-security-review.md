# 11. Theatre Module Security Review & Threat Assessment

This document provides a security assessment of the **Theatre & Branch Management Module**, evaluating threat mitigations against the **OWASP Top 10 API Security Risks (2023)** and enterprise multi-tenant security benchmarks.

---

## 1. OWASP API Security Threat Assessment

| OWASP API Risk | Assessment & Defense Strategy | Compliance Status |
| :--- | :--- | :---: |
| **API1:2023 Broken Object Level Authorization (BOLA / IDOR)** | All owner queries and mutations enforce tenant scope via `findByIdAndPartnerId()` and `updateWithPartner()`. Attempting to read another partner's cinema returns `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration. | ✅ SECURE |
| **API2:2023 Broken Authentication** | All protected owner and administrative routes require dual validation: cryptographically signed JWT bearer token verified against active non-revoked session records in the database. | ✅ SECURE |
| **API3:2023 Broken Object Property Level Authorization (Mass Assignment)** | Strict Zod validation schemas whitelist only permissible business fields. Sensitive attributes (`partnerId`, `ownerId`, `status`, `approvedBy`, `approvedAt`, `isDeleted`, `isSuspended`) are stripped or rejected. | ✅ SECURE |
| **API4:2023 Unrestricted Resource Consumption** | Pagination parameters are strictly clamped (`page >= 1`, `limit <= 100`). Geospatial queries enforce radius limits (max 100 km). Rate limiting middleware protects discovery endpoints from scraper abuse. | ✅ SECURE |
| **API5:2023 Broken Function Level Authorization (BFLA)** | Multi-level middleware pipeline (`authenticate` -> `authorizeRoles` -> `authorizePermission`). Theatre Owners are strictly barred from approving their own properties (`THEATRE_APPROVE` is reserved exclusively for `SUPER_ADMIN`). | ✅ SECURE |
| **API6:2023 Server-Side Request Forgery (SSRF)** | The backend does not perform arbitrary HTTP fetches from user-provided URLs (`websiteUrl`, `googleMapsUrl`). URLs are stored as plain metadata. | ✅ SECURE |
| **API7:2023 Security Misconfiguration** | Strict CORS whitelisting, Helmet security headers, suppression of verbose stack traces in production responses, standardized error envelopes. | ✅ SECURE |
| **API8:2023 Lack of Protection from Automated Threats** | Rate limiters protect search endpoints. Search strings are sanitized against Regular Expression Denial of Service (ReDoS) using regex escaping. | ✅ SECURE |
| **API9:2023 Improper Inventory Management** | All new routes (`/owner/theatres`, `/owner/branches`, `/admin/theatres`, `/theatres`, `/cities`) are versioned under `/api/v1` and documented in OpenAPI 3.0 / Swagger. | ✅ SECURE |
| **API10:2023 Unsafe Consumption of APIs** | Cloudinary and external media assets are handled via pre-authenticated SDK methods and strictly validated asset identifiers. | ✅ SECURE |

---

## 2. Multi-Tenant Privilege Escalation Defense

### 2.1 Self-Approval Prevention
In a multi-tenant marketplace, a partner must never be capable of self-certifying their facilities:
- The `POST /api/v1/owner/theatres` route forces `status = PENDING_APPROVAL` in application logic regardless of any payload properties submitted.
- Approval requires calling `PATCH /api/v1/admin/theatres/:id/approve`, which enforces `authorizeRoles(Roles.SUPER_ADMIN)` and `authorizePermission(Permissions.THEATRE_APPROVE)`.

### 2.2 Super Admin Privilege Delegation Defense
When a theatre owner assigns staff (`POST /api/v1/owner/theatres/:id/staff`):
- The service explicitly checks the target user's role.
- If the target user is already a `SUPER_ADMIN`, or if the requested role is outside `[THEATRE_MANAGER, THEATRE_STAFF]`, the operation is blocked with `403 Forbidden` (`Cannot assign or modify Super Admin privileges`).

---

## 3. Data Integrity & Downstream Protection

1. **Downstream Screen & Show Protection**:
   - Soft-deleting a theatre (`DELETE /api/v1/owner/theatres/:theatreId`) checks `totalScreens > 0`.
   - If screens or auditoriums are already provisioned, destructive deletion is blocked (`409 Conflict`, `RESOURCE_IN_USE`), directing the owner to safely deactivate the cinema property instead.
2. **Referential Integrity for Municipal Data**:
   - The existence and active status of `address.cityId` are verified against the `cities` collection before any theatre can be saved.

---

## 4. Immutable Audit Trail

Every sensitive administrative action is committed to the append-only `audit_logs` collection:

| Audit Action | Trigger | Recorded Metadata |
| :--- | :--- | :--- |
| `THEATRE_REGISTERED` | Owner registers cinema | `theatreId`, `theatreName`, `partnerId`, `slug` |
| `THEATRE_UPDATED` | Owner updates metadata | `theatreId`, modified property keys |
| `THEATRE_OPERATIONS_UPDATED` | Owner updates hours/amenities | `theatreId` |
| `THEATRE_DELETED` | Owner soft-deletes cinema | `theatreId`, `theatreName` |
| `THEATRE_APPROVED` | Admin approves cinema | `theatreId`, `theatreName`, `previousStatus`, admin `userId` |
| `THEATRE_REJECTED` | Admin rejects cinema | `theatreId`, `rejectionReason`, admin `userId` |
| `THEATRE_SUSPENDED` | Admin suspends cinema | `theatreId`, admin `userId` |
| `THEATRE_REACTIVATED` | Admin reactivates cinema | `theatreId`, admin `userId` |
| `STAFF_ASSIGNED` | Owner assigns manager/staff | `theatreId`, `assignedUserId`, `assignedRole` |
| `STAFF_REMOVED` | Owner removes staff assignment | `theatreId`, `removedUserId` |

