# 05 – Authentication and RBAC

## 1. Authentication Strategy
The Super Admin Dashboard restricts access exclusively to authenticated accounts possessing the `SUPER_ADMIN` role:
- Login via `POST /api/v1/auth/login`.
- If the returned user role is not `SUPER_ADMIN`, access is denied, session is discarded, and an error is presented.
- Dual-token JWT rotation via `POST /api/v1/auth/refresh` ensures seamless long-session security.
- Logout via `POST /api/v1/auth/logout` completely flushes cache and local storage.

---

## 2. Server-Authoritative RBAC
Frontend checks enhance UX by hiding inaccessible controls, but every API route independently validates JWT claims and role permissions:
- `authorizeRoles(Roles.SUPER_ADMIN)` protects `/admin/*` routes.
- Destructive operations (rejecting an exhibitor, issuing a refund, modifying commission, cancelling a show) require confirmed backend authorization and trigger immutable audit log entries.

