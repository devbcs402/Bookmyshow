# Background Worker Architecture, Queue Reliability & Idempotent Processing
**Document Reference**: `docs/production/12-queue-operations.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Systems Architect, DevOps Engineer  
**Status**: APPROVED  

---

## 1. Overview & Worker Responsibilities

Asynchronous background processing offloads non-blocking workloads from API request-response threads:
1. **Notification Dispatch**: Asynchronous delivery of confirmation emails, SMS tickets, and WhatsApp messages via external SaaS providers (Twilio, Resend, Meta WhatsApp Cloud).
2. **Booking Expiration Worker**: Sweeps pending-payment bookings whose checkout window (300 seconds) has elapsed, releasing seats back to general availability.
3. **Payment Reconciliation Worker**: Verifies pending transactions against Razorpay gateway status APIs to resolve network dropouts or abandoned webhooks.
4. **Dead-Letter Queue (DLQ) Management**: Quarantines permanently failed jobs for operator inspection without stalling queue throughput.

---

## 2. Idempotency & De-duplication Strategy

Every queued task enforces strict idempotency:
- **Notification Deduplication**: Jobs generate a deterministic key: `notif:{userId}:{bookingId}:{channel}:{eventType}`. If a duplicate job is dispatched, the worker detects the existing key in Redis/MongoDB and skips dispatch.
- **Booking Expiration Idempotency**:
  ```javascript
  const result = await Booking.updateOne(
    { _id: bookingId, status: 'PENDING_PAYMENT', expiresAt: { $lte: new Date() } },
    { $set: { status: 'EXPIRED' } }
  );
  if (result.matchedCount === 0) {
    // Already confirmed, cancelled, or expired by another worker; no-op
    return;
  }
  ```

---

## 3. Retry Architecture & Dead-Letter Handling

```
+-------------------------------------------------------------+
|                      Enqueued Job Event                     |
+-------------------------------------------------------------+
                              |
                              v
                 [ Worker Executes Handler ]
                              |
                     +--------+--------+
                     |                 |
                (Success)           (Failure)
                     |                 |
                     v                 v
            [ Mark Job Done ]     [ Check Attempt < MAX_RETRIES (3) ]
                                       |
                              +--------+--------+
                              |                 |
                            (Yes)              (No)
                              |                 |
                              v                 v
                     [ Exponential Backoff ]   [ Route to DLQ (PERMANENTLY_FAILED) ]
```

### Exponential Backoff Formula
$$\text{delaySeconds} = \text{initialDelay} \times 2^{(\text{attempt} - 1)}$$
For initial delay = 5s:
- Attempt 1: 5 seconds
- Attempt 2: 10 seconds
- Attempt 3: 20 seconds
- Post-Attempt 3: Flagged as `PERMANENTLY_FAILED` and alerted in Sentry/Slack.

---

## 4. Graceful Shutdown Protocol

When a container orchestrator issues `SIGTERM`:
1. The process stops accepting new HTTP connections.
2. Active worker threads are given a **15-second grace window** to finish in-flight jobs.
3. Database and Redis connection pools are closed gracefully (`disconnectRedis()`, `mongoose.connection.close()`).
4. If work exceeds the grace period, the process forcefully exits (`process.exit(0)`), allowing Kubernetes to reschedule unprocessed jobs from the durable queue.

