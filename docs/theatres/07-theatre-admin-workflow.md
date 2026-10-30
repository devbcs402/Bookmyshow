# 07. Super Admin Theatre Review & Governance Workflow

This document details the administrative review, approval, rejection, suspension, and reactivation workflows implemented for **Platform Administrators** in the **Theatre & Branch Management Module**.

---

## 1. Administrative Authority & Responsibilities

Platform administrators (Super Admins) hold cross-tenant governance authority across all regional cinema brands, municipal jurisdictions, and auditoriums:
1. **Compliance Verification**: Ensuring all cinema complexes hold valid trade licenses, fire safety certificates, and local municipal NOCs.
2. **Catalog Integrity**: Preventing duplicate listings, incorrect GPS coordinates, or unverified cinema properties from entering customer discovery.
3. **Regulatory Enforcement**: Suspending properties in violation of tax regulations, payment disputes, or local cinema laws.

---

## 2. Administrative REST API Interfaces

All administrative endpoints reside under the `/api/v1/admin/theatres` route hierarchy and require valid Super Admin credentials:

```javascript
theatreAdminRoutes.use(authenticate);
theatreAdminRoutes.use(authorizeRoles(Roles.SUPER_ADMIN));
```

### 2.1 List All Platform Theatres
- **Endpoint**: `GET /api/v1/admin/theatres`
- **Required Permission**: `THEATRE_READ`
- **Query Filters Supported**:
  - `status`: Filter by any state (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`).
  - `partnerId`: Filter all cinemas owned by a specific commercial partner.
  - `cityId`: Filter by municipal city.
  - `state`: Filter by provincial state (case-insensitive regex).
  - `search`: Match cinema name, street, or area.
  - `page`, `limit`, `sortBy`, `sortOrder`: Standard limit-offset pagination.

---

### 2.2 Inspect Complete Theatre Dossier
- **Endpoint**: `GET /api/v1/admin/theatres/:theatreId`
- **Required Permission**: `THEATRE_READ`
- **Response**: Full entity document populated with `partnerId` (business name, KYC state, email) and `address.cityId` (name, slug, state).

---

### 2.3 Approve Pending Theatre
- **Endpoint**: `PATCH /api/v1/admin/theatres/:theatreId/approve`
- **Required Permission**: `THEATRE_APPROVE`
- **State Machine Verification**:
  - Validates that current status is `PENDING_APPROVAL`, `UNDER_REVIEW`, `DRAFT`, or `INACTIVE`.
  - Rejects approval if the theatre is already `REJECTED` (must be resubmitted by owner first).
- **Mutations Executed**:
  ```javascript
  {
    status: "APPROVED",
    approvedBy: adminContext.id,
    approvedAt: new Date(),
    rejectionReason: "",
    isActive: true,
    isSuspended: false
  }
  ```
- **Audit Logging**: Emits `THEATRE_APPROVED` with actor ID and prior status.

---

### 2.4 Reject Theatre with Justification
- **Endpoint**: `PATCH /api/v1/admin/theatres/:theatreId/reject`
- **Required Permission**: `THEATRE_APPROVE`
- **Request Body**:
  ```json
  {
    "rejectionReason": "The uploaded municipal trade license certificate has expired. Please upload a valid renewal certificate."
  }
  ```
- **Mutations Executed**:
  ```javascript
  {
    status: "REJECTED",
    rejectionReason: req.body.rejectionReason,
    isActive: false
  }
  ```
- **Audit Logging**: Emits `THEATRE_REJECTED` recording the reason for compliance non-repudiation.

---

### 2.5 Suspend Active Theatre
- **Endpoint**: `PATCH /api/v1/admin/theatres/:theatreId/suspend`
- **Required Permission**: `THEATRE_APPROVE`
- **Effect**: Instantly evicts the theatre from customer discovery (`isActive: false`, `isSuspended: true`), blocking new ticket bookings while preserving existing booking records.

---

### 2.6 Reactivate Suspended Theatre
- **Endpoint**: `PATCH /api/v1/admin/theatres/:theatreId/reactivate`
- **Required Permission**: `THEATRE_APPROVE`
- **Effect**: Restores status to `APPROVED`, resets `isSuspended: false`, and sets `isActive: true`.

---

## 3. Threat Mitigation: Self-Approval Prevention

A critical security vulnerability in multi-tenant SaaS is a rogue or malicious theatre owner attempting to approve their own cinema:
- If a `THEATRE_OWNER` submits a request to `PATCH /api/v1/admin/theatres/:id/approve`, the request is intercepted by `authorizeRoles(Roles.SUPER_ADMIN)` and rejected with `403 Forbidden` (`INSUFFICIENT_PERMISSIONS`).
- If an owner attempts to include `"status": "APPROVED"` in `POST /api/v1/owner/theatres` or `PATCH /api/v1/owner/theatres/:id`, the service explicitly strips the status key, forcing it to remain `PENDING_APPROVAL`.

