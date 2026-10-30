# 06. Cinema Branch Management Architecture

This document details the architectural design, physical cinema property modeling, and REST API interfaces governing **Branch Management** within the platform.

---

## 1. Architectural Modeling: Theatres as Branches

### 1.1 Architectural Decision Record (ADR)
During Part 2 database planning (`docs/database/01-collection-inventory.md:21` and `docs/database/05-theatre-and-screen-schema.md`), a fundamental architectural modeling decision was established:

> **Unification of `theatre_branches` into `theatres`**:
> A separate `theatre_branches` collection is redundant. In our domain model:
> 1. `theatre_partners` represents the commercial/legal corporate tenant entity (tax identities, GSTIN, bank accounts).
> 2. `theatres` represents the physical cinema buildings/branches distributed across cities (e.g., PVR Lower Parel, PVR Bandra, PVR Koramangala).
> 3. Each physical cinema complex is inherently a physical branch of the partner chain.

### 1.2 Hierarchical Branch Relationships
To support multi-wing multiplex complexes or sub-locations grouped under a flagship cinema:
- `isBranch: Boolean` (defaults to `true`).
- `parentTheatreId: ObjectId` (optional reference to another `theatres` document representing a flagship hub or parent multiplex).

```
+--------------------------------------------------------+
|       theatre_partners: "PVR INOX Limited"             |
+---------------------------+----------------------------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
+-----------------------+        +-----------------------+
|  theatres (Branch 1)  |        |  theatres (Branch 2)  |
|  "PVR ICON Palladium" |        |  "PVR Dynamix Juhu"   |
|  cityId: Mumbai       |        |  cityId: Mumbai       |
+-----------+-----------+        +-----------------------+
            |
            v
+-----------------------+
|  theatres (Sub-Branch)|
|  "PVR Palladium IMAX" |
|  parentTheatreId: ... |
+-----------------------+
```

---

## 2. Dedicated Branch Endpoints

To provide seamless developer experience for partner frontends, dedicated branch endpoints are exposed under `/api/v1/owner`:

### 2.1 Create Branch under Multiplex
- **Endpoint**: `POST /api/v1/owner/theatres/:theatreId/branches`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Behavior**:
  1. Validates that the parent theatre (`:theatreId`) exists and belongs to the authenticated partner (`req.user.partnerId`).
  2. Sets `parentTheatreId = :theatreId` and `isBranch = true`.
  3. Validates municipal city, coordinates, and operating hours.
  4. Returns `201 Created`.

### 2.2 List Multiplex Branches
- **Endpoint**: `GET /api/v1/owner/theatres/:theatreId/branches`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Behavior**:
  - Returns all physical branches associated with the parent theatre and owned by the partner.

### 2.3 Get Branch Details
- **Endpoint**: `GET /api/v1/owner/branches/:branchId`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Behavior**:
  - Returns the branch record with complete address, coordinates, and media details.

### 2.4 Update Branch Metadata
- **Endpoint**: `PATCH /api/v1/owner/branches/:branchId`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Behavior**:
  - Updates contact info, address, amenities, and operational settings with owner verification.

### 2.5 Toggle Branch Status
- **Endpoint**: `PATCH /api/v1/owner/branches/:branchId/status`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Request Body**: `{ "isActive": false }`
- **Behavior**:
  - Deactivates or reactivates the branch without destroying historical records.

### 2.6 Soft-Delete Branch
- **Endpoint**: `DELETE /api/v1/owner/branches/:branchId`
- **Auth**: `THEATRE_OWNER` or `SUPER_ADMIN`
- **Behavior**:
  - Sets `isDeleted: true`, `isActive: false`, `deletedAt: new Date()`.
  - Rejects deletion if auditoriums or screens are actively configured (`RESOURCE_IN_USE`).

---

## 3. Branch Security & Tenant Invariants

1. **Anti-Hijacking Guard**: An owner cannot attach a new branch to another owner's theatre (`Parent theatre not found under your organization`).
2. **Cascading State**: If a parent partner is suspended by Super Admin, all underlying branches automatically cease appearing in customer discovery.
3. **Data Preservation**: Deactivating a branch preserves all historical customer tickets, audit trails, and financial reconciliation reports.

