# 24 – Frontend Security Architecture

## 1. Security Architecture
- Strict RBAC: Access allowed only for `SUPER_ADMIN`.
- Credential Redaction: Password hashes, OTP secrets, card numbers, and API secrets are never rendered or stored in local storage.
- Anti-CSRF & Mutex Token Refresh: Automated mutex queue prevents simultaneous duplicate refresh requests on token expiration.
- Confirmation Modals: Destructive actions require user confirmation.

