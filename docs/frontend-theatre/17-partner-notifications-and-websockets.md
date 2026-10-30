# 17 – Partner Notifications and WebSockets

## 1. Notification Dispatch Channels
Theatre partners receive system alerts for critical operational milestones:
- **Approval Updates**: Super Admin approval or rejection of new theatre/branch registrations.
- **Show Cancellations**: Automated alert and batch refund telemetry when a show is cancelled.
- **Sell-Out Alerts**: Instant notification when a show reaches 90%+ or 100% capacity.
- **Hardware Maintenance**: Alerts from floor staff regarding screen or audio repairs.

---

## 2. WebSocket Implementation
- Socket client initializes on partner login using `VITE_SOCKET_URL`.
- Subscribes to `partner:<partnerId>` for organization alerts.
- Subscribes to `show:<showId>` on the Live Operations screen to receive instant `SEATS_LOCKED`, `SEATS_UNLOCKED`, and `SEATS_BOOKED` events without manual page refreshes.

