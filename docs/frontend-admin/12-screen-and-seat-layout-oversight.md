# 12 – Screen and Seat Layout Oversight

## 1. Physical Auditorium Oversight
Super Admin monitors screens across all multiplexes:
- `GET /api/v1/admin/screens`: Global list of auditoriums with projection specs (`2D`, `3D`, `IMAX`, `4DX`) and audio engines (`DOLBY_ATMOS`, `DOLBY_7_1`).
- `GET /api/v1/owner/screens/:id/layout`: Inspect 2D seating matrix, category tiers, and aisle spaces.
- Layout Immutability Rule: Super Admin enforces that published layouts are never modified once shows or bookings are associated with them.

