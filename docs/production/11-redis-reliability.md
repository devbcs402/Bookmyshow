# Redis Performance, Concurrency Reliability & Cache Hygiene
**Document Reference**: `docs/production/11-redis-reliability.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Redis Specialist, Distributed Systems Architect  
**Status**: APPROVED  

---

## 1. Overview & Redis Footprint

Redis serves as the distributed coordination backbone of the BookMyShow platform:
1. **Atomic Seat Locking**: Prevents double-booking via Lua scripts during concurrent seat selections.
2. **Distributed Rate Limiting**: Centralized counter management across multi-replica container tasks.
3. **Analytics & Discovery Caching**: Low-latency caching for heavy queries.
4. **Session & Token Revocation**: Instant revocation of compromised refresh token families.
5. **Socket.IO Real-Time Adapter**: Broadcasts seat lock events across server instances.

---

## 2. Key Naming Standards & TTL Policies

| Domain / Use Case | Key Pattern Example | Data Type | Default TTL | Eviction Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Seat Locks** | `show:{showId}:seat:{seatId}:lock` | String (Token) | 300 Seconds | Non-evictable until TTL expiry |
| **User Lock Set** | `user:{userId}:show:{showId}:locked_seats` | Set | 300 Seconds | Cleared atomically with seat release |
| **Rate Limiter** | `rl:{prefix}:{ipOrUserId}` | String (Counter) | 60–900 Seconds | Expires with window |
| **Analytics Cache** | `analytics:admin:{metric}:{timeRange}` | String (JSON) | 300 Seconds | Evictable under memory pressure |
| **Partner Analytics** | `analytics:owner:{partnerId}:{metric}:{timeRange}` | String (JSON) | 300 Seconds | Evictable under memory pressure |
| **Search Autocomplete**| `discovery:autocomplete:{queryPrefix}` | String (JSON) | 600 Seconds | Evictable under memory pressure |

---

## 3. Concurrency Protection & Atomic Lua Scripts

Under no circumstance does the platform execute non-atomic `GET`-then-`SET` operations for seat reservations. 

### Multi-Seat Atomic Lock Script
Executed in [`apps/backend/src/modules/seat-locks/seat-lock.service.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/seat-locks/seat-lock.service.js):
```lua
-- KEYS: Array of seat lock keys [show:showId:seat:seatId:lock]
-- ARGV[1]: Lock Token (UUID)
-- ARGV[2]: Lock TTL in Milliseconds (300000)

for i, key in ipairs(KEYS) do
  local existing = redis.call('GET', key)
  if existing and existing ~= ARGV[1] then
    return 0 -- Conflict detected; abort without acquiring
  end
end

for i, key in ipairs(KEYS) do
  redis.call('SET', key, ARGV[1], 'PX', ARGV[2])
end

return 1 -- All locks acquired atomically
```

---

## 4. Production Redis Configuration Recommendations

### 4.1 Persistence Profile
- **AOF (Append Only File)**: `appendonly yes` with `appendfsync everysec`.
  - Ensures at most 1 second of seat lock data loss in catastrophic ungraceful host shutdown.
- **RDB Snapshots**: Enabled as secondary backup (`save 900 1 300 10 60 10000`).

### 4.2 Maxmemory Policy
- **Policy**: `maxmemory-policy volatile-lru`
  - Ensures Redis evicts expired or expiring cache keys (analytics, search suggestions) first when RAM reaches capacity, preserving authoritative session tokens without TTL.

### 4.3 Non-Blocking Operations
- Production code prohibits `KEYS *`. All administrative scans utilize non-blocking `SCAN` with cursor counts (`COUNT 100`) to prevent blocking the single-threaded Redis event loop.

---

## 5. Reconnection & Circuit Breaking

Implemented in [`apps/backend/src/config/redis.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/config/redis.js):
```javascript
export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn({ msg: 'Redis reconnecting...', attempt: times, delayMs: delay });
        return delay;
      }
    });
  }
  return redisClient;
};
```
If Redis becomes unavailable, rate limiting and caching gracefully fall back to local memory without throwing unhandled exceptions.

