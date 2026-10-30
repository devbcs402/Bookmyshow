# Part 10 — Concurrency, Consistency & Race Condition Analysis

## 1. Executive Summary

Enterprise ticketing architectures must maintain rigorous consistency guarantees under massive concurrency. This document details the specific race condition scenarios analyzed, simulated, and neutralized during the development and verification of Part 10.

---

## 2. Race Condition Scenarios & Mitigations

### Scenario 1: Competing Concurrent Requests for Identical Seats
- **The Threat**: Two customers (User A and User B) select seat `A1` at the exact same millisecond.
- **The Defense**:
  1. *Redis Phase (Part 9)*: Single-threaded Redis Lua script executes atomic acquisition. Only one customer obtains the key `seatlock:{showId}:A1`. The second customer is rejected with `HTTP 409 Conflict`.
  2. *Database Phase (Part 10)*: If both requests managed to reach MongoDB concurrently, the unique partial index `uniq_active_show_seat_reservation` triggers an immediate duplicate key error (`E11000`) on the second insert, aborting its transaction.

---

### Scenario 2: Partial Multi-Seat Booking Collision
- **The Threat**: Customer A requests `[A1, A2, A3]`. Seat `A2` is already confirmed or held by Customer B.
- **The Defense**:
  - The booking creation service queries all requested seats simultaneously inside the database session.
  - If even a single seat in the batch conflicts, the entire booking operation is aborted atomically. Zero partial bookings are permitted.

---

### Scenario 3: Double Network Submission / Client Retry
- **The Threat**: Customer clicks "Pay & Book" on a sluggish mobile 3G connection. The client times out and automatically resends the request with the identical `Idempotency-Key`.
- **The Defense**:
  - The first request creates the booking and caches the response under `idempotency:booking:{key}`.
  - The second request hits the Redis idempotency filter, compares the SHA-256 fingerprint, and returns the cached booking response without attempting database insertion or double-reserving seats.

---

### Scenario 4: Concurrent Payment Confirmation vs Expiration Sweep
- **The Threat**: Customer authorizes payment at second 299. Expiration sweeper worker triggers at second 300.
- **The Defense**:
  - Distributed Redlock `lock:expire:booking:{id}` prevents concurrent mutation.
  - Expiration worker inspects current database status. If status has transitioned to `CONFIRMED`, expiration is safely skipped and the Redis sorted set entry is removed.

---

### Scenario 5: Rapid Successive Cancellation & Re-Booking
- **The Threat**: Customer cancels a booking for seat `A1`. Within milliseconds, another customer attempts to book `A1`.
- **The Defense**:
  - Cancellation updates booking status to `CANCELLED` within a MongoDB transaction.
  - The partial index filter `{ status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] } }` immediately stops tracking `A1` under the cancelled booking.
  - The re-booking request successfully acquires the seat without index collision.

