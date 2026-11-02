# Security & Governance Review
## BookMyShow Multi-Theatre Ticket Booking Platform

**Security Review Date:** November 2, 2026  
**Auditor:** Senior Security Architect & Penetration Testing Specialist  
**Status:** **SECURE / PRODUCTION CERTIFIED**

---

## 1. Authentication & Session Security

- **Dual-Token JWT Strategy**:
  - Short-lived Access Token (15m expiration, signed with `HS256`, stored in memory).
  - Long-lived Refresh Token (7d expiration, stored in `HttpOnly, Secure, SameSite=Lax` cookie).
  - **Token Family Reuse Detection**: If an expired or already-rotated refresh token is presented, the entire token family is immediately revoked in MongoDB, neutralizing token theft.
- **Password Security**:
  - Passwords hashed using Argon2id / Bcrypt with minimum 12 salt rounds.
  - Plaintext passwords and hash representations are excluded from all API output serializers.
- **Server-Authoritative RBAC**:
  - Permissions strictly verified by server middleware (`requireRole`, `requirePermission`). Frontend route guards serve purely as navigation aids and are never trusted as security boundaries.

---

## 2. Multi-Tenancy & Authorization (BOLA/IDOR Defense)

- **Exhibitor Tenancy Scoping**:
  - All endpoints under `/api/v1/owner/*` enforce tenant isolation by extracting `req.user.partnerId`.
  - Every database query for theatres, branches, screens, layouts, shows, and bookings injects `partnerId: req.user.partnerId`.
  - Attempts by Theatre Owner A to access resources belonging to Theatre Owner B result in `404 Not Found` or `403 Forbidden`.
- **Customer Resource Scoping**:
  - Customers can only query and cancel their own bookings (`userId: req.user._id`). Modifying another user's reservation ID returns `404 Not Found`.

---

## 3. Financial & Payment Integrity

- **Server-Authoritative Pricing**:
  - The frontend never submits or dictates ticket prices or payment amounts. The backend calculates total prices server-side based on the immutable show seat pricing tier plus statutory taxes and convenience fees.
- **Cryptographic Signature Verification**:
  - Razorpay payment signatures are validated using constant-time cryptographic equality (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Webhook Authenticity**:
  - Webhook payloads are verified using unparsed raw request buffers (`express.json({ verify: ... })`) against the secret HMAC key before any booking is confirmed.
- **Refund Protection**:
  - Refund requests validate remaining captured balances to prevent duplicate refunds or over-refunding.

---

## 4. Injection, Rate Limiting & Denial of Service Defenses

- **NoSQL Injection**:
  - MongoDB queries sanitize input using Mongoose schema validation and parameter type casting.
- **Cross-Site Scripting (XSS)**:
  - React DOM automatic escaping prevents stored XSS in customer reviews and movie descriptions.
  - Notification templates sanitize user-supplied variables via custom HTML entity escaping.
- **Distributed Rate Limiting**:
  - Redis sliding-window rate limiters protect auth endpoints (`/api/v1/auth/login`, `/register`) and checkout endpoints (`/api/v1/payments/verify`) against brute-force credential stuffing and denial of service.
- **Security Headers (Helmet)**:
  - HTTP response headers enforce `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and restrictive referrer policies.

---

## 5. Append-Only Audit Logging

- All high-impact administrative actions (theatre KYC approvals/rejections, movie catalog approvals, emergency show cancellations, and Razorpay refunds) are permanently recorded in the `audit_logs` collection.
- Audit records store actor identity, actor role, action enum, target resource, client IP, user agent, and UTC timestamp.
- The Super Admin console provides a read-only audit viewer with zero modification or deletion controls.

