# Running All Applications Guide
## BookMyShow Multi-Theatre Ticket Booking Platform

This document details all options for running the full BookMyShow ecosystem locally, port allocations, process management, and live health verification.

---

## 1. Port Allocations & Services Map

| Tier | Service Name | Protocol | Port | Health Check Endpoint |
|---|---|---|---|---|
| **API** | Backend Express Gateway | HTTP / WSS | `5000` | `http://localhost:5000/api/v1/health/live` |
| **Web** | Customer Booking Web App | HTTP | `5173` | Root index / dynamic ping |
| **Portal** | Theatre Partner Dashboard | HTTP | `5174` | Root index / auth ping |
| **Console**| Super Admin Control Tower | HTTP | `5175` | Root index / auth ping |
| **Database**| MongoDB Replica Set | TCP | `27017` | `db.adminCommand('ping')` |
| **Cache** | Redis Cluster Node | TCP | `6379` | `redis-cli ping` |

---

## 2. One-Command Monorepo Orchestration

From the project root:

```bash
npm run dev
```

This single command triggers `concurrently` to run all four services simultaneously in your terminal with color-coded log streams:
- `[backend]` (cyan): Express.js REST API + Socket.IO server on `:5000`
- `[customer]` (magenta): Customer Frontend on `:5173`
- `[theatre]` (yellow): Theatre Partner Dashboard on `:5174`
- `[admin]` (blue): Super Admin Console on `:5175`

---

## 3. Graceful Shutdown & Process Cleanup

- To stop all applications, press `Ctrl + C` in the terminal.
- `concurrently -k` propagates termination signals across all child processes, ensuring no orphaned Node.js or Vite processes remain bound to ports `5000`, `5173`, `5174`, or `5175`.

---

## 4. Verification Checkpoints

After starting the platform with `npm run dev`:

1. **Verify Backend Liveness**:
   ```bash
   curl http://localhost:5000/api/v1/health/live
   # Response: {"status":"ok","timestamp":"..."}
   ```
2. **Verify Backend Readiness (MongoDB & Redis)**:
   ```bash
   curl http://localhost:5000/api/v1/health/ready
   # Response: {"status":"ready","database":"connected","redis":"ready"}
   ```
3. **Verify Interactive Swagger UI**:
   Open `http://localhost:5000/api-docs` in your browser.
4. **Verify Customer Web App**:
   Open `http://localhost:5173` in your browser.
5. **Verify Theatre Partner Portal**:
   Open `http://localhost:5174` in your browser.
6. **Verify Super Admin Console**:
   Open `http://localhost:5175` in your browser.

