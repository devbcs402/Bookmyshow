# 06 – API Client and Services Architecture

## 1. Unified Axios Client Configuration
The API client (`src/services/api/axios.client.js`) handles all communication with `http://localhost:5000/api/v1`.

### Key Features:
1. **Credentials Management**: `withCredentials: true` ensures HttpOnly refresh tokens are passed automatically on token refresh calls.
2. **Authorization Header**: Injects `Bearer <accessToken>` stored in memory or local storage.
3. **Mutex Refresh Queue**: When an access token expires (HTTP 401), queued requests wait for a single refresh request. Once refreshed, all queued requests are resolved with the new token. If refresh fails, session is cleared and user is redirected to `/login`.
4. **Normalized Error Parsing**: Standardizes backend error messages (`response.data.message`, `response.data.errors`) into user-friendly error strings.

---

## 2. API Domain Modules
The API layer is partitioned into dedicated domain files:
- `auth.api.js`: `/auth/*` (register, login, refresh, logout, me).
- `theatres.api.js`: `/owner/theatres/*` (CRUD, operations, media).
- `branches.api.js`: `/owner/theatres/:theatreId/branches`, `/owner/branches/:branchId`.
- `screens.api.js`: `/owner/theatres/:theatreId/screens`, `/owner/screens/:screenId`.
- `seat-categories.api.js`: `/owner/seat-categories/*`.
- `seat-layouts.api.js`: `/owner/screens/:screenId/layout/*` (draft, validate, bulk generate, publish, versions).
- `shows.api.js`: `/owner/shows/*` (CRUD, reschedule, publish, cancel).
- `pricing.api.js`: `/owner/shows/:showId/pricing/*` (set and update category prices).
- `bookings.api.js`: `/owner/bookings` and `/bookings/:bookingId`.
- `analytics.api.js`: `/owner/analytics/*` (overview, bookings, revenue).
- `staff.api.js`: `/owner/theatres/:theatreId/staff/*` (list, invite, remove).
- `movies.api.js`: `/movies` (approved catalog query).
- `notifications.api.js`: `/notifications/*` (list, unread count, mark read).

