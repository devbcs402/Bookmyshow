# Part 9 — Failure Handling, Fault Tolerance & Recovery

## 1. Failure Modes & Mitigations

Distributed ticketing systems must gracefully handle node crashes, network partitions, and third-party disconnections without stranding inventory or producing unrecoverable states.

| Failure Mode | Impact | Architectural Mitigation & Recovery Procedure |
| :--- | :--- | :--- |
| **Client Disconnects / Abandons Cart** | Customer closes browser after locking seats. | **Automatic Self-Healing**: Redis key TTL (300s) elapses. Keys are automatically evicted. No manual intervention required. |
| **Redis Node Restarts / Sentinel Failover** | Ephemeral locks in memory may be flushed or lost. | **Fail-Safe Design**: Primary source of truth for sold seats remains MongoDB. In worst-case Redis flush, seats become available for re-locking; double-booking is strictly impossible because MongoDB ACID transactions (Part 10) re-verify absence of confirmed bookings. |
| **Concurrent Double-Submit / Network Glitch** | Client sends identical POST request twice. | **Idempotency Guard**: `x-idempotency-key` returns cached original 201 response with matching `lockId`. |
| **Unauthorized / Malicious Release Attempt** | Attacker tries to release competitor's lock. | **Safe Compare-and-Delete**: `RELEASE_MULTI_SEAT_LOCKS_LUA` checks `data.userId == req.user.id and data.lockId == lockId`. Attacker request fails safely without releasing victim's hold. |
| **WebSocket Connection Drops** | Client loses real-time sync temporarily. | **Reconnection Resync**: Socket.IO client automatically reconnects and re-fetches `GET /shows/:showId/seats` to retrieve canonical current state. |

---

## 2. Distributed Recovery Workflows

### 2.1 The Stale Lock Race Condition
Consider a customer whose checkout stalled:
1. User A locks Seat 1 at 12:00:00 (expires 12:05:00).
2. User A's browser goes to sleep.
3. At 12:05:00, Redis purges the key for Seat 1.
4. At 12:05:05, User B locks Seat 1 (expires 12:10:05).
5. At 12:05:10, User A's browser wakes up and executes an automatic `DELETE` cleanup call.
6. **Recovery Guarantee**:
   The `RELEASE_MULTI_SEAT_LOCKS_LUA` script inspects the key in Redis:
   - Found `lockId` belongs to User B (`lockId_B`).
   - Incoming request carries `lockId_A`.
   - Script detects mismatch: `data.lockId ~= expectedLockId`.
   - Script takes **no action** on the key.
   - User B's lock remains completely safe and untouched.

---

## 3. High Availability Redis Topology

In production deployment, the Redis tier is configured as a high-availability cluster:
1. **Redis Sentinel or AWS ElastiCache Multi-AZ with Auto-Failover**:
   - Master node handles all read/write locking requests.
   - Hot Standby replica continuously replicates commands via asynchronous replication.
   - If the Master fails, Sentinel promotes the Standby in under 3 seconds.
2. **Circuit Breaking & Health Checks**:
   - The `/api/v1/health` endpoint actively pings Redis.
   - If Redis connection latency exceeds 2,000ms or fails, health status flips to `DEGRADED`, alerting SRE teams before cascading failures impact customers.

