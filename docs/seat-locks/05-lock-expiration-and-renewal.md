# Part 9 — Lock Expiration & Renewal Mechanics

## 1. Natural TTL Expiration & Redis Authority

In high-concurrency systems, relying on database sweepers or scheduled cron jobs to clear expired locks is inherently flawed:
- Cron jobs introduce a lag window (e.g., if a sweeper runs every 30 seconds, a seat may remain locked 30 seconds longer than promised).
- Under high loads, batch deletion queries lock database tables and degrade throughput.

### 1.1 The Redis TTL Invariant
In our architecture, **Redis TTL is the absolute source of truth** for seat lock expiration:
1. When a lock is acquired, Redis applies a millisecond-precision TTL via `PSETEX` (default: 300,000 ms).
2. Once 300 seconds elapse, Redis automatically makes the key non-retrievable and queues it for passive/active memory eviction.
3. Subsequent `GET /shows/:showId/seats` queries or lock attempts see the key as non-existent immediately at $t = 300.001\text{s}$.
4. No background worker or cron process is required to make the seat available again.

---

## 2. Lock Renewal: Preventing Unfair Seat Squatting

When a user is entering card details or completing bank 3D-Secure 2FA verification, 5 minutes may sometimes be insufficient. However, allowing unlimited renewals allows malicious bots or scalpers to squat on prime seats indefinitely.

### 2.1 The Anti-Squatting Guardrails
1. **Configurable TTL Extension**: Each renewal grants an additional `SEAT_LOCK_TTL_SECONDS` (default: 300 seconds).
2. **Hard Renewal Ceiling**: Governed by `MAX_LOCK_RENEWALS` (default: `2`). A user may renew a lock at most twice, imposing an absolute upper bound of 15 minutes ($300\text{s} \times (1 + 2)$) on any booking session.
3. **Strict Ownership Verification**: Renewal requires the caller to prove ownership via matching `lockId` and `userId`.
4. **Active State Verification**: A lock that has already expired cannot be renewed; it returns `404 Not Found (LOCK_EXPIRED)`.

---

## 3. Atomic Renewal Script: `RENEW_MULTI_SEAT_LOCKS_LUA`

To prevent race conditions where one seat expires while another seat is renewed, renewal is executed as an atomic multi-key Lua transaction:

```lua
-- KEYS: Array of seat lock keys [seatlock:{showId}:{seat1}, ...]
-- ARGV[1]: expectedLockId
-- ARGV[2]: expectedUserId
-- ARGV[3]: extensionTtlSeconds
-- ARGV[4]: maxRenewals

local expectedLockId = ARGV[1]
local expectedUserId = ARGV[2]
local extensionTtlSeconds = tonumber(ARGV[3])
local maxRenewals = tonumber(ARGV[4])
local extensionTtlMs = extensionTtlSeconds * 1000

-- STEP 1: VALIDATION PASS
local payloads = {}
for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if not val then
    return { 0, 'LOCK_EXPIRED', key }
  end

  local data = cjson.decode(val)
  if data.lockId ~= expectedLockId or data.userId ~= expectedUserId then
    return { 0, 'OWNERSHIP_MISMATCH', key }
  end

  local currentRenewals = tonumber(data.renewalCount) or 0
  if currentRenewals >= maxRenewals then
    return { 0, 'MAX_RENEWALS_EXCEEDED', key }
  end

  payloads[i] = data
end

-- STEP 2: ATOMIC EXTENSION PASS
local newRenewalCount = (tonumber(payloads[1].renewalCount) or 0) + 1
for i, key in ipairs(KEYS) do
  local data = payloads[i]
  data.renewalCount = newRenewalCount
  data.ttlSeconds = extensionTtlSeconds
  redis.call('psetex', key, extensionTtlMs, cjson.encode(data))
end

return { 1, 'OK', tostring(newRenewalCount) }
```

---

## 4. Real-Time Expiration Broadcasts

To keep spectator clients in sync when a customer abandons their cart and lets the timer lapse:
1. When clients fetch seat availability, the remaining seconds are returned (`lockedUntil`). The client frontend displays an accurate countdown.
2. In production, Redis Keyspace Notifications (`notify-keyspace-events Ex`) can be subscribed to via `seatlock:*:*` to trigger immediate `seat:expired` broadcast over WebSocket when a key naturally elapses.
3. If keyspace notifications are disabled on a managed Redis tier, clients automatically re-poll on timer expiration or receive updates when another user acquires or queries the seat.

