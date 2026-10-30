# 10. Theatre & Branch Module Testing & Quality Report

This document reports the testing strategy, test suite breakdown, coverage metrics, and edge cases verified across the **Theatre & Branch Management Module**.

---

## 1. Test Suite Summary

The entire backend test harness executes under Jest in ES Modules with Supertest and MongoDB in-memory mocking.

| Metric | Measurement | Target | Status |
| :--- | :---: | :---: | :---: |
| **Total Test Suites** | **27** | > 20 | ✅ PASSED |
| **Total Test Cases** | **201** | > 150 | ✅ PASSED |
| **Passing Tests** | **201** | 201 | ✅ PASSED |
| **Failing Tests** | **0** | 0 | ✅ PASSED |
| **Pass Rate** | **100%** | 100% | ✅ PASSED |
| **Code Style Compliance** | **0 Errors, 0 Warnings** | 0 | ✅ PASSED |

---

## 2. Dedicated Part 6 Test Suites Breakdown (41 Tests)

### 2.1 Unit Test Suites

#### 1. Theatre Service Unit Tests (`tests/unit/theatre.service.test.js`) — 16 Tests
- `registerTheatre`: Derives partner ownership from authenticated user context.
- `registerTheatre`: Initializes status to `PENDING_APPROVAL`.
- `registerTheatre`: Rejects if user has no partner ID context (`TENANT_ACCESS_DENIED`).
- `registerTheatre`: Rejects if referenced city does not exist or is inactive.
- `registerTheatre`: Rejects invalid GeoJSON coordinates outside $[-180, 180]$ and $[-90, 90]$.
- `registerTheatre`: Rejects duplicate `theatreCode` registered under the same partner tenant.
- `getMyTheatres`: Queries theatres strictly filtered by `partnerId`.
- `getTheatreByIdForOwner`: Returns cinema record when owned by partner.
- `getTheatreByIdForOwner`: Throws `404 Not Found` if cinema belongs to another partner.
- `updateTheatre`: Updates allowed fields and prevents modification of protected attributes.
- `softDeleteTheatre`: Soft deletes cinema when `totalScreens === 0`.
- `softDeleteTheatre`: Throws `409 Conflict` (`RESOURCE_IN_USE`) if active screens are configured.
- `approveTheatre`: Transitions status from `PENDING_APPROVAL` to `APPROVED`.
- `rejectTheatre`: Rejects cinema with compliance justification note.
- `approveTheatre`: Throws `400 Bad Request` on invalid state machine transitions.
- `assignStaff`: Assigns manager to cinema; blocks privilege escalation to Super Admin.

#### 2. Branch Service Unit Tests (`tests/unit/branch.service.test.js`) — 5 Tests
- `createBranch`: Creates branch linked to parent cinema and partner.
- `createBranch`: Throws `404 Not Found` if parent cinema does not belong to partner.
- `listBranches`: Returns all branches belonging to parent cinema.
- `getBranchById`: Returns branch with partner ownership verification.
- `toggleBranchStatus`: Toggles operational active status.

---

### 2.2 Integration Test Suites

#### 3. Theatre Endpoints (`tests/integration/theatre.test.js`) — 8 Tests
- `POST /api/v1/owner/theatres`: Successfully registers theatre with `201 Created` for `THEATRE_OWNER`.
- `POST /api/v1/owner/theatres`: Rejects customer role with `403 Forbidden`.
- `GET /api/v1/owner/theatres`: Returns `200 OK` with paginated cinemas for owner.
- `PATCH /api/v1/admin/theatres/:id/approve`: Approves theatre with `200 OK` when called by `SUPER_ADMIN`.
- `PATCH /api/v1/admin/theatres/:id/approve`: Rejects `THEATRE_OWNER` with `403 Forbidden` (Anti-self approval).
- `PATCH /api/v1/admin/theatres/:id/reject`: Rejects theatre and persists `rejectionReason`.
- `GET /api/v1/theatres`: Returns public approved cinemas list.
- `POST /api/v1/owner/theatres/:id/staff`: Assigns manager to theatre.

#### 4. Multi-Tenant Isolation & BOLA/IDOR (`tests/integration/theatre-owner-isolation.test.js`) — 5 Tests
- Owner A cannot view Owner B's cinema (`404 Not Found`).
- Owner A cannot update Owner B's cinema (`404 Not Found`).
- Owner A cannot soft-delete Owner B's cinema (`404 Not Found`).
- Owner A cannot create branches under Owner B's cinema (`404 Not Found`).
- Owner B can access their own cinema properties (`200 OK`).

#### 5. Branch Endpoints (`tests/integration/branch.test.js`) — 5 Tests
- `POST /api/v1/owner/theatres/:theatreId/branches`: Creates branch with `201 Created`.
- `GET /api/v1/owner/theatres/:theatreId/branches`: Lists branches with `200 OK`.
- `GET /api/v1/owner/branches/:branchId`: Returns branch details.
- `PATCH /api/v1/owner/branches/:branchId/status`: Toggles branch active flag.
- `DELETE /api/v1/owner/branches/:branchId`: Soft deletes branch.

---

## 3. Full Regression Test Execution Output

```text
Test Suites: 27 passed, 27 total
Tests:       201 passed, 201 total
Snapshots:   0 total
Time:        43.518 s
Ran all test suites.
```

