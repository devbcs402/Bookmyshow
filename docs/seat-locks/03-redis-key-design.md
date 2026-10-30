# Part 9 — Redis Key Design & Memory Optimization

## 1. Key Namespaces & Conventions

Redis key design follows strict enterprise naming conventions to ensure predictable namespacing, zero collision risk between distinct shows or users, low memory serialization overhead, and support for pattern-based queries where necessary.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             REDIS KEY SCHEMES                               │
├────────────────────────────────┬───────────────────────────┬────────────────┤
│ PURPOSE                        │ KEY FORMAT                │ DEFAULT TTL    │
├────────────────────────────────┼───────────────────────────┼────────────────┤
│ Ephemeral Seat Lock            │ seatlock:{showId}:{seatId}│ 300 seconds    │
│ User Active Lock Index Set     │ userlocks:{userId}:{show} │ 300 seconds    │
│ API Request Idempotency Cache  │ idempotency:seatlock:...  │ 600 seconds    │
│ WebSocket Multi-Instance Sync  │ seat-events:channel       │ Pub/Sub Channel│
└────────────────────────────────┴───────────────────────────┴────────────────┘
```

---

## 2. Key Architecture & Payload Formats

### 2.1 Seat Lock Key: `seatlock:{showId}:{seatId}`
- **Type**: Redis String (JSON-serialized payload).
- **TTL**: Configurable via `SEAT_LOCK_TTL_SECONDS` (default: `300` seconds / 5 minutes).
- **Key Construction**:
  ```javascript
  const key = `seatlock:${showId}:${seatId}`;
  ```
- **Stored Value Schema**:
  ```json
  {
    "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
    "showId": "67220b3f81e7d23a104f9b01",
    "seatId": "65f1a2b3c4d5e6f7a8b9c0f3",
    "userId": "65f1a2b3c4d5e6f7a8b9c0u1",
    "lockedAt": "2026-11-06T19:00:00.000Z",
    "expiresAt": "2026-11-06T19:05:00.000Z",
    "ttlSeconds": 300,
    "renewalCount": 0,
    "maxRenewals": 2
  }
  ```

### 2.2 User Lock Index Set: `userlocks:{userId}:{showId}`
- **Type**: Redis Set (`SSADD`, `SMEMBERS`, `SREM`).
- **TTL**: Refreshed to match the longest remaining seat TTL.
- **Value**: Stored members are the individual `seatId` strings.
- **Purpose**: Enables rapid lookup of all seats currently held by a specific patron for a specific screening session without running full-cluster pattern scans.

### 2.3 Idempotency Record: `idempotency:seatlock:{userId}:{idempotencyKey}`
- **Type**: Redis String (JSON-serialized response cache).
- **TTL**: 600 seconds (10 minutes).
- **Purpose**: Prevents duplicate locking attempts caused by network timeouts, mobile retry loops, or impatient user double-clicks.
- **Stored Value Schema**:
  ```json
  {
    "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
    "showId": "67220b3f81e7d23a104f9b01",
    "userId": "65f1a2b3c4d5e6f7a8b9c0u1",
    "lockedSeats": [
      {
        "seatId": "65f1a2b3c4d5e6f7a8b9c0f3",
        "seatLabel": "A1",
        "categoryCode": "RECLINER",
        "unitPrice": 531.0
      }
    ],
    "expiresAt": "2026-11-06T19:05:00.000Z",
    "ttlSeconds": 300,
    "remainingSeconds": 300,
    "renewalCount": 0,
    "maxRenewals": 2
  }
  ```

---

## 3. Querying & Scanning Strategy

### 3.1 Why `KEYS` Command Is Strictly Prohibited in Production
The standard Redis `KEYS seatlock:{showId}:*` command runs in $O(N)$ time where $N$ is the total number of keys in the Redis database. Because Redis is single-threaded, executing `KEYS` across a database with 500,000 keys blocks all concurrent requests for several hundred milliseconds, leading to cascading HTTP timeouts.

### 3.2 Non-Blocking `SCAN` Cursor Traversal
In `RedisLockService.getActiveLocksForShow`, we employ cursor-based `SCAN` iteration:
```javascript
let cursor = '0';
const matchedKeys = [];
const pattern = `seatlock:${showId}:*`;

do {
  const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
  cursor = nextCursor;
  if (keys.length > 0) {
    matchedKeys.push(...keys);
  }
} while (cursor !== '0');
```
- **Properties**:
  - Incremental: Returns a bounded chunk of keys per step without freezing the event loop.
  - Pipelined Batch Retrieval: After gathering the keys, a single `redisClient.mget(matchedKeys)` fetches all payloads in a single network roundtrip.

---

## 4. Memory Footprint & Scaling Calculations

Let us calculate the memory requirement for a tier-1 multiplex operator running 500 screens across 20 cities:

| Metric | High-Contention Scenario |
| :--- | :--- |
| **Concurrent Active Shows** | 2,500 simultaneous screenings |
| **Peak Active Locks per Show** | 40 seats held simultaneously |
| **Total Ephemeral Keys in Redis** | 100,000 active lock keys |
| **Average Payload Size** | ~280 bytes per JSON string |
| **Redis Key Overhead (dictEntry + robj)** | ~64 bytes per key |
| **Total Memory Required** | $\approx 35 \text{ MB}$ |

Even under peak blockbuster traffic with 100,000 concurrent seat locks, Redis memory consumption remains under **50 MB**, making it exceptionally cost-efficient, resilient, and virtually immune to out-of-memory (OOM) failures.

