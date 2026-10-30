# Theatre & Show Discovery System
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/08-theatre-and-show-discovery.md`**

---

## 1. City-Centric Multiplex Discovery

All theatre schedules and show listings are scoped by the customer's active city:
1. **City Selection Modal**: Accessible from the global header. Lists popular metros (Mumbai, Delhi-NCR, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad) along with all active cities retrieved from `GET /api/v1/cities`.
2. **City Persistence**: Stored in `localStorage` under `bms_selected_city`.
3. **Reactive Query Invalidation**: Changing the city invalidates show queries and refreshes nearby theatre availability automatically.

---

## 2. Show Selection & Date Strip

When viewing a movie (`/movies/:slug`) or a cinema (`/theatres/:theatreId`):
1. **Date Strip (`DateSelector`)**: Displays next 7 calendar dates starting from `TODAY`.
2. **Schedule Aggregation**: Backend endpoint `GET /api/v1/movies/:movieId/shows?cityId=...&date=...` returns active published shows.
3. **Showtime Button (`ShowtimePill`)**:
   - Renders 12-hour formatted time (e.g. `10:30 AM`).
   - Format pill (2D, 3D, IMAX, 4DX).
   - Audio format (Dolby Atmos).
   - Sold out detection: disabled button with `Sold Out` badge when `availableSeatsCount === 0`.
   - Clicks transition immediately into real-time seat selection: `/booking/:showId/seats`.

