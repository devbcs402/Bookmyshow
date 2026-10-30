# API Integration Architecture & Axios Client
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/05-api-integration.md`**

---

## 1. Centralized HTTP Client

All network traffic flows through the single Axios client at `src/services/api/axios.client.js`.

### 1.1 Base Configuration
```javascript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 15000
});
```

### 1.2 Request Interceptor
Attaches short-lived JWT access tokens from `localStorage.getItem('bms_access_token')` via `Authorization: Bearer <token>`.

### 1.3 Automatic Refresh Queue (Mutex)
When concurrent requests fail with HTTP 401:
1. The first failed request sets `isRefreshing = true` and triggers `POST /api/v1/auth/refresh`.
2. Subsequent 401s append their promise resolvers to `failedQueue`.
3. When the new access token arrives, all queued requests are resolved with the new header and replayed.
4. If the refresh request itself fails (session invalidated or expired), `bms:auth:expired` event is dispatched and tokens are wiped.

---

## 2. API Service Modules Summary

| Module | File | Target Endpoints |
|---|---|---|
| Auth | `auth.api.js` | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/password/*` |
| Users | `users.api.js` | `/users/me`, `/users/me/sessions` |
| Movies | `movies.api.js` | `/movies`, `/movies/:slug`, `/movies/now-showing`, `/genres`, `/languages` |
| Discovery | `discovery.api.js` | `/recommendations`, `/search/suggestions`, `/users/me/recently-viewed` |
| Theatres | `theatres.api.js` | `/cities`, `/theatres`, `/theatres/id/:id`, `/theatres/search` |
| Shows | `shows.api.js` | `/shows`, `/shows/:id`, `/shows/:id/seats`, `/movies/:id/shows` |
| Seat Locks | `seat-locks.api.js` | `/shows/:id/seat-locks` (POST/DELETE/PATCH renew) |
| Bookings | `bookings.api.js` | `/bookings`, `/bookings/me`, `/bookings/:id`, `/bookings/:id/cancel` |
| Payments | `payments.api.js` | `/payments/create-order`, `/payments/verify`, `/payments/:id` |
| Notifications | `notifications.api.js` | `/notifications`, `/notifications/unread-count`, `/notifications/preferences` |

