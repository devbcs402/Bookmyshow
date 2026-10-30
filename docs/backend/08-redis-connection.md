# 08. Redis Connection Architecture & Reconnection Strategy

## 1. Overview & Operational Responsibilities

Redis operates as the in-memory acceleration and synchronization tier. Managed via **`ioredis`** inside `src/config/redis.js`, it fulfills four distinct operational roles:
1. **Distributed Temporary Seat Locking**: Sub-10ms atomic holds via custom Lua scripts.
2. **Catalog Response Caching**: Stale-While-Revalidate caching for active movie schedules and city listings.
3. **Socket.IO Event Scaling**: Multi-node WebSocket fanout via Redis Pub/Sub.
4. **Rate Limiting**: Sliding-window IP request counters.

> [!IMPORTANT]
> **MongoDB is the permanent, durable ground truth for all booking transactions and ledger records.** Redis is strictly utilized for ephemeral, high-throughput caching, rate limits, and temporary seat locks.

---

## 2. Reconnection Backoff Strategy (`retryStrategy`)

Transient network hiccups must never bring down the Node.js application process. The client implements jittered exponential backoff:

```javascript
redisClient = new Redis(config.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000); // Caps maximum delay at 3 seconds
    logger.warn({ msg: 'Redis reconnecting...', attempt: times, delayMs: delay });
    return delay;
  }
});
```

---

## 3. Redis Health Check Telemetry (`getRedisHealth()`)

The infrastructure health endpoint evaluates Redis reachability by issuing an active `PING` command and measuring round-trip latency in milliseconds:

```javascript
export const getRedisHealth = async () => {
  if (!redisClient) {
    return { status: 'disconnected', isHealthy: false, latencyMs: null };
  }

  try {
    const start = Date.now();
    const pong = await redisClient.ping();
    const latencyMs = Date.now() - start;

    return {
      status: redisClient.status,
      isHealthy: pong === 'PONG',
      latencyMs
    };
  } catch (_error) {
    return { status: redisClient.status, isHealthy: false, latencyMs: null };
  }
};
```

---

## 4. Graceful Disconnection

During application termination (`SIGINT`, `SIGTERM`), the shutdown coordinator triggers `disconnectRedis()`, awaiting `redisClient.quit()` to ensure active background writes and pipeline commands finish cleanly before closing TCP sockets.

