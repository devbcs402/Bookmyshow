# 14. Authentication Testing Report

## 1. Executive Summary

A comprehensive test suite was engineered across unit, integration, security, and edge-case testing tiers using **Jest** and **Supertest** running under native Node.js ES Modules.

| Metric | Result |
| :--- | :--- |
| **Total Test Suites** | **17 passed, 17 total (100%)** |
| **Total Tests** | **116 passed, 116 total (100%)** |
| **Code Style & Linting** | **Zero ESLint errors, 100% Prettier compliance** |
| **Execution Environment** | Node.js v24 LTS + native VM ES Modules |

---

## 2. Test Suite Breakdown

### Unit Test Suites (13 Suites)

1. `tests/unit/auth.utils.test.js`:
   - Password hashing and verification with Bcrypt (12 rounds).
   - SHA-256 secret hashing determinism.
   - Secure random token and 6-digit numeric OTP generation.
   - Dual-token JWT generation and payload verification.
   - Lowercase email and Indian phone (`+91` E.164) normalization.
   - Secure `HttpOnly` cookie options configuration.

2. `tests/unit/auth.service.test.js`:
   - Retail customer registration and duplicate detection.
   - Theatre partner registration with `PENDING_APPROVAL` status.
   - Identifier resolution (Email vs Phone) and password verification.
   - Pending partner and inactive user login prevention.
   - Single-use Refresh Token rotation.
   - **Token Family Reuse Detection**: Stolen/replayed token triggers cascade revocation of the entire token family.
   - Numeric OTP generation, 60s cooldown, and 5-attempt brute-force throttling.
   - Anti-enumeration generic password reset messaging.

3. `tests/unit/auth.middleware.test.js`:
   - Missing, malformed, or expired Bearer access token rejection (401).
   - Database session validity and revoked session detection (401).
   - Inactive user account filtering (401).
   - Role-Based Access Control (`authorizeRoles`).
   - Granular permission enforcement (`authorizePermission`).
   - Super Admin global permission bypass.
   - Multi-tenant boundary enforcement (`requireTenantScope`).

4. `tests/unit/users.service.test.js`:
   - Profile retrieval without password hashes.
   - Whitelisted profile modification (`name`, `cityId`).
   - Privilege escalation defense: attempts to alter `role`, `permissions`, or `partnerId` are safely ignored.
   - Account deactivation and immediate session revocation.
   - Active sessions enumeration and current device tagging.
   - Targeted and bulk session revocation.

5. `tests/unit/users.controller.test.js`:
   - Controller response formatting and cookie clearing hooks.

6. `tests/unit/notifications.test.js`:
   - `EmailProvider` transactional email, OTP, and password reset templates.
   - `SmsProvider` SMS dispatch and phone number masking.

7. `tests/unit/error.middleware.test.js`:
   - Centralized handling for `AppError`, Mongoose validation errors, CastError (invalid ObjectId), MongoDB E11000 duplicate keys, and CORS rejections.

8. `tests/unit/infrastructure.test.js`, `env.test.js`, `middlewares.test.js`, `responses.test.js`, `errors.test.js`:
   - Environment schema validation, rate limiter handlers, API response formatting, and custom error classes.

---

### Integration Test Suites (4 Suites)

1. `tests/integration/auth.test.js`:
   - `POST /api/v1/auth/register`: 201 Created on valid input, 400 Bad Request on Zod validation failure.
   - `POST /api/v1/auth/theatre-owner/register`: 201 Created with `PENDING_APPROVAL`.
   - `POST /api/v1/auth/login`: 200 OK + `Set-Cookie` (`HttpOnly`, `SameSite=Strict`).
   - `POST /api/v1/auth/refresh`: 200 OK on token rotation.
   - `POST /api/v1/auth/logout`: 200 OK + cookie invalidation.
   - `POST /api/v1/auth/password/forgot`: 200 OK with anti-enumeration response.

2. `tests/integration/users.test.js`:
   - `GET /api/v1/users/me`: 401 Unauthorized without token; 200 OK with profile when authenticated.
   - `PATCH /api/v1/users/me`: 200 OK on profile update.
   - `GET /api/v1/users/me/sessions`: 200 OK with session list.
   - `DELETE /api/v1/users/me`: 200 OK on account deactivation.

3. `tests/integration/rbac-tenancy.test.js`:
   - Role enforcement: Customer blocked from accessing partner route (403 `INSUFFICIENT_PERMISSIONS`).
   - Permission enforcement: Customer blocked from `SHOW_CREATE` (403); Theatre Owner permitted (200).
   - **Cross-Tenant Isolation**: Theatre Owner A accessing Theatre Owner B resource strictly rejected with 403 Forbidden (`TENANT_ACCESS_DENIED`).
   - Super Admin cross-tenant global administrative clearance (200 OK).

4. `tests/integration/health.test.js`, `app.test.js`:
   - Kubernetes liveness/readiness probes and 404 handler integration.

