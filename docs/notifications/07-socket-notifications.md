# Part 12 — Socket.IO Real-Time Notifications & Private User Rooms

## 1. Overview

While database persistence provides durable storage, real-time interactivity requires instant push updates to user browsers and mobile apps. The platform integrates with the existing Socket.IO and Redis Pub/Sub infrastructure to deliver instant notification badges, unread counter increments, and live toast popups.

---

## 2. Private User Room Architecture

To prevent cross-user message leaks (IDOR on WebSockets), the server automatically joins authenticated connections to private, cryptographically scoped rooms:

```javascript
// src/sockets/index.js
io.on(SocketEvents.CONNECTION, socket => {
  if (socket.data.user?.isAuthenticated && socket.data.user?.id) {
    const userRoom = `user:${socket.data.user.id}`;
    socket.join(userRoom);
  }
});
```

### Security Invariants
1. **Server-Enforced Joining**: Private user rooms are joined automatically during authentication verification.
2. **No Arbitrary Room Joining**: Clients are prohibited from emitting custom "join room" events for other users' IDs.
3. **Multi-Tab Support**: If a user has 3 browser tabs open (or mobile app + desktop web simultaneously), all sockets join the same `user:<userId>` room. An alert delivered to the room reaches all active screens simultaneously.

---

## 3. Real-Time Event Specifications

| Socket Event | Direction | Payload Structure | UI Trigger |
| :--- | :--- | :--- | :--- |
| `notification:new` | Server -> Client | `{ id, title, message, type, category, metadata, createdAt }` | Renders immediate toast alert on customer screen and increments badge count. |
| `notification:read` | Server -> Client | `{ notificationId }` | Updates read status in active notification dropdown. |
| `notification:unread-count-updated` | Server -> Client | `{ unreadCount }` | Updates badge counter on the navigation bell icon. |

---

## 4. Multi-Instance Horizontal Scaling (Redis Adapter)

In production deployments with multiple Node.js API worker instances behind an Nginx load balancer:
- The Socket.IO Redis Adapter broadcasts events across cluster instances.
- When an API worker on Server 1 dispatches a notification for User A (whose WebSocket is connected to Server 2), Redis Pub/Sub forwards the message to Server 2, ensuring seamless delivery across horizontal server boundaries.
- If Redis is temporarily degraded, the system degrades gracefully to local instance broadcasting without crashing.

---

## 5. Offline Recovery & Fallback Strategy

WebSockets are inherently ephemeral. If a customer is offline (phone locked, airplane mode, subway ride):
- Socket.IO delivery fails silently without errors.
- The notification has already been committed to the MongoDB `notifications` collection.
- When the customer's device reconnects, the frontend client queries `GET /api/v1/notifications/unread-count` and `GET /api/v1/notifications` to fetch missed updates.

