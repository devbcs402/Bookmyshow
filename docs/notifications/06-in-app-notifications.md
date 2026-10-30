# Part 12 — In-App Notifications & Durable Storage

## 1. Overview

In-app notifications provide customers and theatre operators with a persistent, searchable notification feed directly inside the web and mobile applications (represented by the bell icon 🔔 in the navigation header).

Unlike transient push alerts or SMS, in-app notifications are stored durably in MongoDB. If a customer is offline when an event occurs, they can retrieve their notification history upon logging back in.

---

## 2. In-App Data Schema & Architecture

Persisted in the `notifications` collection:

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c099",
  "userId": "65f1a2b3c4d5e6f7a8b9c001",
  "title": "Booking Confirmed! 🎟️",
  "message": "Your booking BK-20261030-XYZ789 for Inception is confirmed. Seats: A1, A2.",
  "type": "BOOKING_CONFIRMED",
  "category": "TRANSACTIONAL",
  "relatedEntityType": "booking",
  "relatedEntityId": "65f1a2b3c4d5e6f7a8b9c088",
  "metadata": {
    "bookingReference": "BK-20261030-XYZ789",
    "movieTitle": "Inception",
    "ticketUrl": "http://localhost:3000/tickets/BK-20261030-XYZ789"
  },
  "isRead": false,
  "readAt": null,
  "isDeleted": false,
  "createdAt": "2026-10-30T10:00:00.000Z",
  "updatedAt": "2026-10-30T10:00:00.000Z"
}
```

---

## 3. High-Performance Indexing Strategy

1. **User Feed Index**:
   `{ userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 }`
   - Powers instantaneous retrieval of the customer's chronological feed.
   - Enables zero-table-scan unread count calculations.
2. **Auto-Purge TTL Index**:
   `{ createdAt: 1 }, { expireAfterSeconds: 5184000 }` (60 Days)
   - Automatically cleans up historical in-app notifications past 60 days to prevent unbounded collection growth.

---

## 4. Broken Object Level Authorization (BOLA / IDOR) Defense

Customer privacy is enforced strictly at the repository boundary:
- When a customer calls `PATCH /api/v1/notifications/:id/read` or `DELETE /api/v1/notifications/:id`:
  ```javascript
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, isDeleted: false },
    { $set: updateFields }
  );
  if (!notification) {
    throw new AppError('Notification not found or access denied', HttpStatus.NOT_FOUND);
  }
  ```
- If User B attempts to manipulate User A's notification ID, the query returns `null`, and the endpoint responds with `404 Not Found` (preventing ID enumeration).

---

## 5. Soft Deletion & Unread Count Synchronization

- Notifications are soft-deleted via `isDeleted: true` to preserve auditability while immediately removing the record from the user's active UI view.
- Any read mutation (`markAsRead` or `markAllAsRead`) recalculates the real-time unread count and broadcasts the updated value to the user's active WebSocket connection.

