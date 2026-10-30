# Booking Engine Integration & Idempotency
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/10-booking-workflow.md`**

---

## 1. Booking Creation Workflow

After seats are locked in Redis, the booking is created via the Part 10 Booking Engine:
1. **Creation Request**: `POST /api/v1/bookings` with payload `{ showId, seatIds }` and an `idempotency-key` header.
2. **Server-Side Validation**:
   - Verifies that the client holds an active Redis lock for every requested seat.
   - Verifies show status is `SCHEDULED` or `BOOKING_OPEN`.
   - Ensures no overlapping confirmed bookings exist in MongoDB.
3. **Pending State**: The booking document is persisted in `PENDING_PAYMENT` state with a 10-minute payment window.
4. **Authoritative Pricing Snapshot**: Server computes base ticket price, convenience fee, GST breakdown (18%), and net payable amount.

---

## 2. Idempotency Guarantees

To protect against duplicate charges during network glitches or rapid double-clicks:
- The client generates a unique UUID v4 idempotency token per seat lock session.
- Attached in the HTTP header: `Idempotency-Key: <uuid>`.
- The backend caches the resulting booking under this key in Redis for 300 seconds; retried requests return the original booking without re-executing transactions.

