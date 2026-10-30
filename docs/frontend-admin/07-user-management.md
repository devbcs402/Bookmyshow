# 07 – User Management and Account Exploration

## 1. User Governance Model
Super Admin can inspect user accounts and actors across the platform:
- Actors logged in the immutable audit log (`GET /api/v1/admin/audit-logs`).
- Platform customer metrics and registration trends from analytics (`GET /api/v1/admin/analytics/overview`).
- Role distribution across `CUSTOMER`, `THEATRE_OWNER`, `THEATRE_MANAGER`, `THEATRE_STAFF`, and `SUPER_ADMIN`.

---

## 2. Security & Redaction Safeguards
- Zero credential exposure: Password hashes, OTP secrets, and JWT refresh tokens are never exposed or rendered.
- Audit history inspection allows admins to trace suspicious logins, session revocations, and profile updates.

