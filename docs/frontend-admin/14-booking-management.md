# 14 – Booking Management

## 1. Platform-Wide Booking Explorer
Super Admin has read access across all customer reservations:
- `GET /api/v1/owner/bookings`: Paginated booking records filterable by status (`CONFIRMED`, `CANCELLED`, `EXPIRED`, `PENDING_PAYMENT`).
- `GET /api/v1/bookings/:id`: Comprehensive booking pass showing customer contact details, allocated seats, price breakdown, and QR verification status.
- Strict Rule: Admins cannot manually mark unpaid bookings as confirmed.

