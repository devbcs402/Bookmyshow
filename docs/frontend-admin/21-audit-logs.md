# 21 – Administrative Audit Logs

## 1. Immutable Audit Trail
Mounted under `/api/v1/admin/audit-logs`:
- Append-only event tracking recording every administrative mutation.
- Captures `actorId`, `actorRole`, `action`, `targetResource`, `targetResourceId`, `requestId`, `clientIp`, `status`, and `timestamp`.
- Strict Rule: Audit logs are completely read-only in the admin interface; no edit or delete controls exist.

