# Part 12 — Notification System Architecture & System Topology

## 1. Executive Summary

The **Notification System Module** provides an enterprise-grade, omnichannel, and provider-agnostic communication engine for the BookMyShow clone platform. Designed to decouple business event generation from physical message dispatch, the module orchestrates transaction alerts, booking confirmations, digital tickets, security advisories, and administrative broadcasts across four distinct channels:
1. **Email**: Rich responsive HTML with plain-text fallback.
2. **SMS**: Telecom DLT-compliant transaction alerts.
3. **WhatsApp**: Official Meta WhatsApp Business Platform Cloud API template messaging.
4. **In-App & Real-Time**: Durable MongoDB storage paired with sub-second Socket.IO push delivery to private user rooms.

---

## 2. Core Architectural Objectives

| Objective | Specification | Implementation Strategy |
| :--- | :--- | :--- |
| **Provider Independence** | Swap email, SMS, or WhatsApp vendors without touching business logic | Factory adapter interfaces (`EmailProviderAdapter`, `SmsProviderAdapter`, `WhatsAppProviderAdapter`) isolating vendor SDKs behind uniform domain methods. |
| **Non-Blocking Delivery** | Zero impact on critical booking and payment response latency | Business services dispatch notifications asynchronously via `setImmediate` and Redis/in-memory queues. External failures never abort bookings. |
| **Omnichannel Coordination** | Coordinated multi-channel delivery driven by user preferences | Centralized `NotificationService` queries `NotificationPreference` and delivers to all permitted channels simultaneously. |
| **Durable In-App Ledger** | Permanent record of customer notifications | Persisted in MongoDB `notifications` collection with read tracking, 60-day TTL indexing, and unread counters. |
| **Zero IDOR / BOLA Vulnerability** | Strict user-level isolation of notification records | Every fetch, read update, or delete query enforces `{ _id, userId }` scoping at the repository layer. Socket rooms are strictly scoped to authenticated `user:<userId>`. |
| **Deduplication Invariance** | Safe under webhook retries and network duplicate requests | Idempotency keys hashed into unique sparse indexes on `notification_deliveries`. Duplicate requests short-circuit as idempotent no-ops. |
| **Resilient Retry & Backoff** | Graceful handling of telecom outages and gateway rate limits | Exponential backoff algorithm ($5 \times 2^{n-1}$) with dead-letter queue routing after exhausting maximum attempts. |

---

## 3. High-Level System Topology

```mermaid
flowchart TD
    subgraph BusinessLayer ["Business Modules (Parts 4, 10, 11)"]
        AuthMod["Auth Service (Welcome, OTP, Password)"]
        BookingMod["Booking Engine (Confirmed, Cancelled)"]
        PaymentMod["Payment Gateway (Success, Refunds)"]
        AdminMod["Admin Control Tower (Broadcasts)"]
    end

    subgraph CentralEngine ["Notification Central Orchestrator"]
        Facade["NotificationService Facade"]
        PrefSvc["NotificationPreferenceService"]
        TplEngine["TemplateEngine (HTML Sanitized)"]
        QueueSvc["NotificationQueueService (Redis/Memory)"]
    end

    subgraph DurableStorage ["Durable Storage Layer (MongoDB)"]
        InAppColl[("notifications Collection\n(60-day TTL)")]
        DeliveryColl[("notification_deliveries Collection\n(Unique Idempotency Key)")]
        PrefColl[("notification_preferences Collection")]
        TplColl[("notification_templates Collection")]
    end

    subgraph RealTime ["Real-Time WebSocket Tier"]
        SocketServer["Socket.IO Server\nRoom: user:<userId>"]
    end

    subgraph ProviderAdapters ["Provider Adapters Layer"]
        EmailAdapter["EmailProviderAdapter\n(SMTP / Resend / Mock)"]
        SmsAdapter["SmsProviderAdapter\n(Fast2SMS / Twilio / Mock)"]
        WaAdapter["WhatsAppProviderAdapter\n(WhatsApp Business Cloud API)"]
    end

    %% Workflow Flow
    AuthMod -->|sendNotification| Facade
    BookingMod -->|sendNotification (Async)| Facade
    PaymentMod -->|sendNotification (Async)| Facade
    AdminMod -->|broadcastAnnouncement| Facade

    Facade --> PrefSvc
    PrefSvc --> PrefColl
    Facade --> TplEngine
    TplEngine --> TplColl

    %% In-App Path
    Facade -->|Persist In-App Record| InAppColl
    Facade -->|Emit notification:new| SocketServer

    %% External Queue Path
    Facade -->|Create Delivery (QUEUED)| DeliveryColl
    Facade -->|Enqueue External Job| QueueSvc

    %% Worker Execution
    QueueSvc -->|Deliver Job| EmailAdapter
    QueueSvc -->|Deliver Job| SmsAdapter
    QueueSvc -->|Deliver Job| WaAdapter

    EmailAdapter -->|Update Delivery Status| DeliveryColl
    SmsAdapter -->|Update Delivery Status| DeliveryColl
    WaAdapter -->|Update Delivery Status| DeliveryColl
```

---

## 4. Key Module Components

1. **`notification.service.js`**: Central facade coordinating preference checking, template compilation, in-app storage, Socket.IO push, delivery job creation, and background queueing.
2. **`notification-preference.service.js`**: Manages customer channel and category preferences, enforces mandatory security alert delivery, and tracks explicit WhatsApp opt-in consent.
3. **`template.engine.js`**: Renders variables (`{{key}}`), sanitizes HTML inputs to prevent XSS, and resolves localized fallbacks across English, Hindi, and Gujarati.
4. **`notification-queue.service.js`**: Redis/in-memory queue with exponential backoff retry scheduling, lock guards, and dead-letter queue routing.
5. **`notification-socket.service.js`**: Publishes real-time events (`notification:new`, `notification:read`, `notification:unread-count-updated`) to private user rooms (`user:<userId>`).
6. **`admin-notification.service.js`**: Handles platform announcements, audience segmentation (`ALL`, `CUSTOMERS`, `THEATRE_OWNERS`), and delivery statistics aggregation.

