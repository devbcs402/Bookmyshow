# Part 10 — Booking Cancellation & Refund Policy Engine

## 1. Executive Summary

Ticket cancellation in a corporate entertainment platform requires balancing customer flexibility with theatre operator revenue security. Part 10 establishes a configurable cancellation engine that evaluates show start times, cut-off windows, role authorizations, and inventory release protocols.

---

## 2. Cancellation Business Rules

| Rule | Specification | Enforcement Point |
| :--- | :--- | :--- |
| **Cancellation Cutoff Window** | Minimum 2 hours prior to show start time (`startTime - now >= 2h`) | `BookingStatusService.validateTransition` |
| **Past Show Protection** | Show has already commenced or concluded | Rejected with `HTTP 409 Conflict` (`SHOW_ALREADY_STARTED`) |
| **Status Preconditions** | Booking must currently be in `CONFIRMED` or `PENDING_PAYMENT` | Rejected with `HTTP 409 Conflict` (`BOOKING_NOT_CANCELLABLE`) |
| **Customer Ownership Isolation** | Customers can only cancel their own bookings (`customerId === req.user.id`) | `bookingRepository.findByIdAndCustomer` |
| **Theatre Owner Authority** | Venue operators can cancel shows/bookings for their screens; bypasses cutoff for emergency screenings | Checked against `req.user.partnerId` |
| **Admin Authority** | Super Admins can cancel any booking at any time | Role check `SUPER_ADMIN` |

---

## 3. Cancellation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated Customer
    participant GW as API Gateway
    participant BS as BookingService
    participant BSS as BookingStatusService
    participant DB as MongoDB Transaction
    participant Redis as Redis Locks
    participant Socket as Socket.IO

    User->>GW: POST /api/v1/bookings/:bookingId/cancel (reason)
    GW->>BS: cancelBooking(bookingId, actor, reason)
    
    BS->>DB: Query Booking Document
    DB-->>BS: Booking Details
    
    BS->>BS: Verify Ownership (actor.id == customerId OR role == ADMIN)
    BS->>BSS: validateTransition(currentStatus, CANCELLED, { showStartTime, actorRole })
    
    alt Cancellation Cutoff Breached (< 2h before show)
        BSS-->>BS: Throw AppError 409 (BOOKING_NOT_CANCELLABLE)
        BS-->>User: HTTP 409 Conflict: Cancellation cutoff has passed
    else Validation Successful
        BS->>DB: Start Transaction
        BS->>DB: Update Booking (status: CANCELLED, cancellation subdoc)
        BS->>DB: Append Status History Entry
        DB-->>BS: Success
        BS->>DB: Commit Transaction
        
        BS->>Redis: Release Ephemeral Locks (DEL seatlock keys)
        BS->>Socket: Emit BOOKING_CANCELLED (show room)
        BS-->>User: HTTP 200 OK (Booking Cancelled, Refund Status)
    end
```

---

## 4. Cancellation Subdocument Schema

When a booking is cancelled, the details of the cancellation are recorded immutably:

```json
{
  "cancelledAt": "2026-10-30T11:00:00.000Z",
  "cancelledBy": "65f1a2b3c4d5e6f7a8b9c001",
  "reason": "Change of travel plans",
  "cancellationFee": 0.0,
  "refundableAmount": 870.8,
  "refundStatus": "PENDING"
}
```

---

## 5. Inventory Restoration

Because of the MongoDB compound unique partial index on `{ showId: 1, 'seats.seatId': 1 }` with `partialFilterExpression: { status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] } }`:
- Transitioning the status to `CANCELLED` causes the document to automatically drop out of the partial index filter.
- The seats are instantly released at the database level and become available for other customers immediately.
- Real-time Socket.IO broadcasts alert active users on the seating chart that the seats have returned to `AVAILABLE`.

