# Booking History & Cancellation Engine
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/13-booking-history.md`**

---

## 1. Booking History Interface (`/my-bookings`)

Patrons manage their active and past cinema reservations across 4 segmented tabs:
1. **All Bookings**: Comprehensive chronological history of customer transactions.
2. **Upcoming**: Active confirmed bookings with show start times in the future.
3. **Completed**: Historical screenings where the show start time has elapsed.
4. **Cancelled**: Bookings cancelled by patron or cancelled due to screen maintenance.

Each booking card displays:
- Movie poster thumbnail and title.
- Cinema multiplex and auditorium screen name.
- Formatted show date and start time.
- Assigned seats.
- Total amount paid.
- Status badge (`CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED`, `REFUNDED`).
- Actions: "View Pass" (opens digital ticket) or "Cancel" (triggers cancellation modal).

---

## 2. Cancellation Policy & Workflow

1. **Eligibility Check**: Bookings are cancellable if the scheduled showtime is at least **2 hours** in the future.
2. **Confirmation Modal**: Displays the cancellation terms, booking reference, and reason dropdown (Change of plans, Booked wrong date, Emergency).
3. **Backend Cancellation Execution**: Calls `POST /api/v1/bookings/:bookingId/cancel`.
4. **Inventory Reversion**: The backend immediately releases reserved seats in MongoDB and Redis, publishing a Socket.IO event to free the seats for other customers.
5. **Refund Initiation**: Initiates an automated refund through the Razorpay refund API, updating the booking status to `REFUNDED`.

