# 12. Security Architecture & Threat Mitigations

## 1. Executive Summary

The authentication and authorization architecture adheres strictly to the **OWASP Top 10:2021** and **OWASP API Security Top 10:2023** benchmarks, ensuring bank-grade protection across customer identity, partner data, and transactional integrity.

---

## 2. Threat Vector Mitigation Matrix

| Vulnerability Category | Risk Scenario | Platform Architectural Mitigation |
| :--- | :--- | :--- |
| **Broken Access Control (A01:2021)** | Tenant A accessing Tenant B's screens or revenue | Enforced `requireTenantScope` middleware matching JWT claims with request boundaries. Injects `req.tenantPartnerId` into queries. |
| **Cryptographic Failures (A02:2021)** | Stolen database passwords / token sniffing | Passwords hashed with **Bcrypt (12 rounds)**. Refresh tokens hashed with **SHA-256**. Refresh cookie marked `HttpOnly, Secure, SameSite=Strict`. |
| **Injection (A03:2021)** | NoSQL operator injection (`{ "$gt": "" }`) | Strict **Zod schema parsing** strips arbitrary MongoDB operators before reaching services. Mongoose parameterized queries. |
| **Insecure Design (A04:2021)** | Token theft via replay attacks | **Token Family Rotation (RTR)**. Presenting a stale token triggers an automatic revocation cascade across all devices in that family. |
| **Security Misconfiguration (A05:2021)** | Header leakage, clickjacking, permissive CORS | **Helmet** security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`), strict CORS origin whitelisting. |
| **Vulnerable & Outdated Components (A06:2021)** | Known CVEs in third-party libraries | Modern stable packages (`jsonwebtoken ^9.0.3`, `bcryptjs ^3.0.3`, `zod ^3.24.2`). Zero deprecated packages. |
| **Identification & Auth Failures (A07:2021)** | Credential stuffing, account enumeration, brute force | **Rate limiting (15 req / 15m)** on auth routes. Generic responses for failed login and password recovery. OTP throttled to 5 attempts. |
| **Software & Data Integrity Failures (A08:2021)** | Unauthorized tampering with audit history | Append-only `audit_logs` collection. Mongoose schema hooks explicitly intercept and reject `update`, `save`, and `delete` mutations on logs. |
| **Security Logging & Monitoring Failures (A09:2021)** | Undetected intrusion or breach | **Pino structured JSON logging** correlated with unique `x-request-id` headers on every transaction. Sensitive fields masked. |
| **Server-Side Request Forgery (SSRF) (A10:2021)** | Exploitation of email/SMS webhooks | Outbound notification providers run through hardened abstractions with strict domain and URL schema validations. |

---

## 3. Immutable Audit Logging Architecture

Security-sensitive events generate immutable audit records in the `audit_logs` collection:
- `USER_REGISTERED`
- `THEATRE_OWNER_REGISTERED`
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `LOGOUT_SUCCESS` / `LOGOUT_ALL_SUCCESS`
- `TOKEN_REUSE_DETECTED`
- `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_SUCCESS`
- `PASSWORD_CHANGED`
- `BOOTSTRAP_SUPER_ADMIN`

### Tamper-Proof Schema Design
```javascript
// Pre-update hooks prevent tampering with historic audit trails
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Mutation prohibited: Audit logs are strictly immutable and append-only.');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('Deletion prohibited: Audit logs cannot be purged.');
});
```

