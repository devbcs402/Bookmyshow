# 07. MongoDB Connection Architecture & Lifecycle Management

## 1. Overview & Connection Architecture

The MongoDB data layer is managed via **Mongoose v8** inside `src/config/database.js`. In enterprise architectures, the connection lifecycle must handle connection pooling, network timeouts, replica step-downs, reconnect events, and zero-downtime graceful teardowns.

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: connectDatabase()
    Connecting --> Connected: mongoose.connect() OK
    Connected --> Reconnecting: Network glitch / Step-down
    Reconnecting --> Connected: Auto-reconnected
    Connected --> Disconnecting: gracefulShutdown()
    Disconnecting --> Disconnected: mongoose.disconnect() OK
    Disconnected --> [*]
```

---

## 2. Connection Pool Configuration

The MongoDB client is tuned for high-throughput concurrency:

```javascript
const connectionOptions = {
  maxPoolSize: 50,                   // Up to 50 concurrent sockets per Node process
  minPoolSize: 5,                    // Maintain 5 warm sockets ready for instant queries
  serverSelectionTimeoutMS: 5000,    // Fail fast if primary replica is unreachable within 5s
  socketTimeoutMS: 45000,            // Close sockets inactive for > 45s
  autoIndex: config.NODE_ENV !== 'production' // Prohibit dynamic indexing in production
};
```

---

## 3. Lifecycle Event Telemetry

The database connection binds native Mongoose event listeners:
- `connected`: Logs active cluster host and database name (with credentials masked).
- `error`: Emits structured error logs.
- `disconnected`: Warns of dropped connection pools.
- `reconnected`: Emits recovery alerts.

---

## 4. Connection Health Check Probe (`getDatabaseHealth()`)

Infrastructure health checks (`/api/v1/health` and `/api/v1/health/ready`) poll database status dynamically using an administrative ping command:

```javascript
export const getDatabaseHealth = async () => {
  const readyState = mongoose.connection.readyState;
  const isHealthy = readyState === 1;

  let latencyMs = null;
  if (isHealthy && mongoose.connection.db) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      latencyMs = Date.now() - start;
    } catch (_err) {
      latencyMs = -1;
    }
  }

  return {
    status: isHealthy ? 'connected' : 'disconnected',
    isHealthy,
    latencyMs
  };
};
```

---

## 5. Security & Credential Protection

- Database URIs (`mongodb://user:pass@host:27017/db`) are automatically scrubbed using regex before any log output:
  `uri.replace(/:([^@]+)@/, ':****@')`
- Plaintext database passwords never appear in application console logs, telemetry events, or error reports.

