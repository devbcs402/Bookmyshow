# Part 9 — Seat Availability & Locking Testing Report

## 1. Test Suite Summary

Part 9 introduces 63 automated tests across 8 specialized test suites covering unit logic, integration workflows, high-concurrency race conditions, BOLA security boundaries, and real-time Socket.IO broadcasts.

```
========================================================================================
                          TEST EXECUTION METRICS: PART 9
========================================================================================
Total Test Suites Executed:    47 Suites (100% Passed)
Total Tests Executed:          371 Tests (100% Passed)
Part 9 Specific Test Suites:   8 Suites
Part 9 Specific Tests:         63 Tests
Execution Duration:            ~31.4 seconds
Zero Regressions across Parts 1 through 8.
========================================================================================
```

---

## 2. Test Suite Breakdown

### 2.1 Unit Test Suites
1. **`tests/unit/redis-lock.service.test.js`** (13 tests)
   - Evaluates key builders (`buildSeatLockKey`, `buildUserLocksKey`, `buildIdempotencyKey`).
   - Verifies `ACQUIRE_MULTI_SEAT_LOCKS_LUA` script execution, successful multi-key lock creation, and atomic conflict abortion.
   - Verifies `RELEASE_MULTI_SEAT_LOCKS_LUA` safe release with matching `lockId` and `userId`.
   - Verifies `RENEW_MULTI_SEAT_LOCKS_LUA` extension and renewal limit enforcement.
   - Tests `getActiveLocksForShow` SCAN iteration and batch MGET.
   - Tests idempotency save and retrieval.
2. **`tests/unit/seat-availability.service.test.js`** (4 tests)
   - Tests synthesis of physical seats, MongoDB booked seats, and Redis ephemeral locks.
   - Verifies guest user perspective (`userId = null`).
   - Verifies error handling for non-existent and cancelled shows.
3. **`tests/unit/seat-lock.service.test.js`** (14 tests)
   - Validates `acquireSeatLocks` end-to-end orchestration.
   - Enforces 10-seat limit rejection.
   - Validates physical seat screen ownership checks.
   - Validates confirmed booking collision checks.
   - Tests safe release and renewal workflows with event emission.
4. **`tests/unit/seat-lock-expiration.test.js`** (3 tests)
   - Tests key parsing and extraction of `showId` and `seatId`.
   - Tests malformed key rejection.
   - Validates broadcast triggers on expired seat cleanup.
5. **`tests/unit/seat-lock.socket.test.js`** (10 tests)
   - Verifies event builders: `emitSeatLocked`, `emitSeatReleased`, `emitSeatExpired`, `emitSeatBooked`, `emitAvailabilityUpdated`.
   - Verifies that emitted payloads contain strictly zero PII.
   - Tests socket room joining (`join:show`) and leaving (`leave:show`).

---

### 2.2 Integration Test Suites
6. **`tests/integration/seat-lock.test.js`** (14 tests)
   - `GET /api/v1/shows/:showId/seats`: Public guest view vs authenticated user view (`LOCKED_BY_ME`).
   - `POST /api/v1/shows/:showId/seat-locks`: Happy path hold acquisition with HTTP 201 Created.
   - Validation failures: Missing seats, empty array, > 10 seats, non-hex ObjectIds.
   - Idempotency header test (`x-idempotency-key` returns cached 201).
   - Double-locking attempt returns HTTP 409 Conflict (`SEAT_UNAVAILABLE`).
   - `DELETE /api/v1/shows/:showId/seat-locks`: Release flow verification.
   - `PATCH /api/v1/shows/:showId/seat-locks/renew`: Valid renewal and max renewals limit rejection.
7. **`tests/integration/seat-lock-concurrency.test.js`** (2 tests)
   - **Simultaneous Contention**: Two users simultaneously send overlapping requests for `[A1, A2]` vs `[A2, A3]`.
   - **Verification**: Exactly 1 user succeeds (HTTP 201), competing user fails (HTTP 409).
   - **Zero Partial Locks**: Seat `A3` remains completely available.
8. **`tests/integration/seat-lock-ownership.test.js`** (3 tests)
   - **BOLA Protection**: User B attempts to release User A's active lock with a mismatched `lockId`. Redis leaves User A's lock intact.
   - **Renewal BOLA**: User B attempts to renew User A's lock using their own JWT token. Returns HTTP 404/403.
   - **Expired Lock Overwrite**: Older release call fails to delete a newer user's hold.

---

## 3. Test Command & Continuous Integration

To run all Part 9 seat locking tests:
```bash
cd apps/backend
npx jest tests/**/seat-lock*.test.js tests/**/redis-lock*.test.js tests/**/seat-avail*.test.js --runInBand
```

To run the complete platform suite:
```bash
cd apps/backend
npm test
```
All 47 suites pass with 100% compliance.

