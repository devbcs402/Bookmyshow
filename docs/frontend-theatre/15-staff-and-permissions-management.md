# 15 – Staff and Permissions Management

## 1. Delegated Team Oversight
Theatre owners can delegate operational tasks to on-ground staff while keeping financial data strictly private.

### Supported Staff Roles:
1. **THEATRE_MANAGER**:
   - Manages show schedules, pricing, screen configurations, and staff assignments.
   - Forbidden from viewing partner settlement accounts or bank payouts.
2. **THEATRE_STAFF**:
   - Access to admissions desk, ticket validation, and booking lookup.
   - Read-only show schedules.

---

## 2. Staff Management API
- `POST /api/v1/owner/theatres/:theatreId/staff`: Assigns an existing registered user as theatre manager or staff.
- `GET /api/v1/owner/theatres/:theatreId/staff`: Lists all members assigned to the theatre with active role badges.
- `DELETE /api/v1/owner/theatres/:theatreId/staff/:userId`: Revokes staff credentials instantly.

