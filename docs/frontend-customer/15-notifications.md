# Omnichannel Notifications & Real-Time Alerts
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/15-notifications.md`**

---

## 1. Notification Center Architecture (`/notifications`)

The notification subsystem provides real-time in-app alerts and badge counters:
- **Badge Counter in Global Header**: Calls `GET /api/v1/notifications/unread-count` on navigation and pulses with an active unread count badge.
- **Categorized In-App Alerts**:
  - `BOOKING_CONFIRMATION`: High-priority alert when a payment verifies.
  - `SEAT_LOCK_EXPIRATION`: Warning when an active seat lock window is expiring.
  - `BOOKING_CANCELLATION`: Receipt of cancellation and refund status.
- **Actions**:
  - Single mark as read: `PATCH /api/v1/notifications/:id/read`.
  - Bulk mark all as read: `PATCH /api/v1/notifications/read-all`.
  - Dismiss notification: `DELETE /api/v1/notifications/:id`.

---

## 2. Real-Time Socket.IO Synchronization

In `src/services/socket/socket.client.js`, authenticated sockets join their private user channel: `user:<userId>`.
- When the backend dispatches a notification, the event `notification:new` is delivered instantly without HTTP polling.
- The `NotificationsPage` and `Header` listener invalidates the query cache to reflect the new notification and increment the badge count in real-time.

