# Show Management Security & Multi-Tenant Threat Assessment

## 1. Threat Modeling (OWASP API Security Top 10)

| Threat Code | Vulnerability / Threat Scenario | Mitigation Strategy Implemented | Verification Status |
|---|---|---|---|
| **API1:2023 - BOLA** | Owner A attempts to edit, reschedule, or cancel Owner B's shows via show ID tampering. | Strict token-derived tenant scoping. Unauthorized requests return `404 Not Found` (anti-enumeration). | Verified via `show-owner-isolation.test.js` |
| **API2:2023 - Broken Authentication** | Unauthenticated callers attempt to schedule or cancel shows. | JWT `authenticate` middleware enforced on all `/owner/shows` endpoints. | Verified |
| **API3:2023 - Broken Object Property Level Authorization** | Caller attempts to bypass pricing or force show status to `PUBLISHED` via mass assignment. | Strict Zod validation strips unpermitted fields; status transitions managed via dedicated controller actions. | Verified |
| **API4:2023 - Unrestricted Resource Consumption** | Rapid bursts of scheduling requests creating denial of service or race condition collisions. | Distributed Redis screen mutex with 10s TTL + sliding window rate limiting. | Verified |
| **API5:2023 - Broken Function Level Authorization** | Customer account attempts to create or cancel shows. | `authorizeRoles(THEATRE_OWNER, THEATRE_MANAGER, SUPER_ADMIN)` blocks customers with `403 Forbidden`. | Verified |

---

## 2. Server-Side Context Integrity
Under no circumstances is `partnerId`, `theatreId`, or `ownerId` accepted from the frontend request payload as an assertion of ownership:
1. `req.user.partnerId` is cryptographically validated from the signed access token.
2. The service layer verifies that `targetTheatre.partnerId === req.user.partnerId`.
3. If an attacker attempts to supply another partner's `theatreId` or `showId`, the query fails to find a matching document under that partner scope, throwing `NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND)`.

