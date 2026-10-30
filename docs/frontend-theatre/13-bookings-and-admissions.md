# 13 – Bookings and Admissions Management

## 1. Tenant-Isolated Booking Explorer
Theatre staff and managers can search, inspect, and verify bookings strictly belonging to their theatres.

### Key Capabilities:
- **Filtering & Search**: Search by Booking Reference ID, Customer Phone, Email, Movie Title, or Show Date.
- **Booking Statuses**:
  - `CONFIRMED`: Paid, valid for cinema admission.
  - `CANCELLED`: Refunded or cancelled prior to cutoff.
  - `EXPIRED`: Pending booking that was not completed in time.
- **Admission Details**:
  - Allocated seat labels (e.g., A12, A13).
  - Screen number and auditorium hall.
  - Show time and audio format.
  - Customer contact details for box-office lookup.

---

## 2. Front-Desk QR Ticket Scanner
The dashboard includes an admission verification interface:
- Operators can manually input or scan the digital ticket QR code.
- Instantly verifies ticket authenticity, checks if the ticket was already admitted, and presents admission status (`VALID`, `ALREADY_CHECKED_IN`, `INVALID`).

