# Administrative Audit Logging Subsystem & Immutability Architecture
**Document Reference**: `docs/production/08-audit-logging.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Principal Backend Architect, Security Engineer  
**Status**: APPROVED  

---

## 1. Overview & Regulatory Compliance

In a commercial SaaS ticketing platform, tracking sensitive business operations (theatre approvals, staff appointments, booking cancellations, refund dispatches, and credential updates) is a regulatory requirement under financial audit standards and cyber security guidelines.

The BookMyShow backend provides an **immutable, append-only administrative audit logging subsystem** backed by MongoDB and restricted exclusively to `SUPER_ADMIN` operators.

---

## 2. Immutability Architecture & Tamper-Proofing

Audit records cannot be modified or purged through application routes or standard Mongoose mutation queries.

Enforced in [`apps/backend/src/modules/auth/model/audit-log.model.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/auth/model/audit-log.model.js):
```javascript
// Append-only policy: Prevent updates or deletions on audit logs
auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
  function (next) {
    const err = new Error('IMMUTABLE_AUDIT_LOG: Audit log records cannot be updated or deleted');
    if (typeof next === 'function') {
      return next(err);
    }
    throw err;
  }
);
```

Any programmatic attempt to mutate or delete an existing audit log document throws a fatal `IMMUTABLE_AUDIT_LOG` exception, ensuring non-repudiation.

---

## 3. Data Schema & Compound Indexing

```javascript
const auditLogSchema = new mongoose.Schema({
  actorId: { type: ObjectId, ref: 'users', default: null, index: true },
  actorRole: { type: String, default: 'ANONYMOUS' },
  action: { type: String, required: true, index: true },
  targetResource: { type: String, default: 'auth' },
  targetId: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  details: { type: Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
});

auditLogSchema.index({ targetResource: 1, targetId: 1, timestamp: -1 });
```

---

## 4. Administrative REST Endpoints

All audit log query endpoints are mounted under `/api/v1/admin/audit-logs` and guarded by `authenticate` and `authorizeRoles(Roles.SUPER_ADMIN)`.

### 4.1 Query Paginated Audit Logs: `GET /api/v1/admin/audit-logs`
Supports filtering by actor, action, target resource, and ISO date ranges.

- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `actorId` (ObjectId string)
  - `action` (e.g. `THEATRE_APPROVED`, `SHOW_CREATED`, `LOGIN_SUCCESS`)
  - `targetResource` (e.g. `theatres`, `movies`, `bookings`, `auth`)
  - `startDate` (ISO 8601 string)
  - `endDate` (ISO 8601 string)

- **Example Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c099",
      "actorId": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0a1",
        "name": "Root Administrator",
        "email": "superadmin@bookmyshow.example.com",
        "role": "SUPER_ADMIN"
      },
      "actorRole": "SUPER_ADMIN",
      "action": "THEATRE_APPROVED",
      "targetResource": "theatres",
      "targetId": "65f1a2b3c4d5e6f7a8b9c0e1",
      "ipAddress": "203.0.113.45",
      "userAgent": "Mozilla/5.0 ... Chrome/120.0",
      "details": {
        "theatreName": "PVR Inox Grand",
        "partnerId": "65f1a2b3c4d5e6f7a8b9c0p1"
      },
      "timestamp": "2026-10-30T10:15:30.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

### 4.2 Retrieve Single Audit Log: `GET /api/v1/admin/audit-logs/:auditLogId`
Fetches complete, unredacted event metadata for forensics and security investigations.

- **HTTP Status**:
  - `200 OK` on successful retrieval.
  - `404 Not Found` if ID does not exist.
  - `403 Forbidden` if caller lacks `SUPER_ADMIN` privileges.

