# Production Readiness & Deployment Checklist
## BookMyShow Multi-Theatre Ticket Booking Platform

**Release Verification:** Production Candidate (v1.0.0)  
**Target Environment:** Cloud Kubernetes (EKS / GKE) or Docker Swarm with Nginx Ingress

---

## 1. Quality Gates & Certification Summary

| Gate | Criterion | Measured Result | Verdict |
|---|---|---|---|
| **Backend Unit & Integration Tests** | 100% Pass Rate | 81 suites / 625 tests passed | ✅ CERTIFIED |
| **Customer Frontend Tests** | 100% Pass Rate | 8 suites / 18 tests passed | ✅ CERTIFIED |
| **Theatre Dashboard Tests** | 100% Pass Rate | 8 suites / 15 tests passed | ✅ CERTIFIED |
| **Admin Console Tests** | 100% Pass Rate | 5 suites / 13 tests passed | ✅ CERTIFIED |
| **Customer Frontend Build** | Zero Compile Errors | Vite build bundled into `dist/` | ✅ CERTIFIED |
| **Theatre Dashboard Build** | Zero Compile Errors | Vite build bundled into `dist/` | ✅ CERTIFIED |
| **Admin Console Build** | Zero Compile Errors | Vite build bundled into `dist/` | ✅ CERTIFIED |
| **ESLint & Code Standards** | Zero Lint Errors | Clean AST lint validation | ✅ CERTIFIED |
| **Concurrency Safeguards** | Zero Double-Booking | Atomic Redis Lua multi-seat locking | ✅ CERTIFIED |

---

## 2. Infrastructure & Cloud Deployment Prerequisites

### 1. Database Tier (MongoDB 7.0+ Replica Set)
- Provision a multi-node MongoDB Replica Set (e.g., MongoDB Atlas M30+).
- Set write concern to `w: majority` for ACID transaction durability across booking commits.
- Configure automatic daily snapshots and point-in-time recovery (PITR).

### 2. In-Memory Distributed Cache (Redis 7.2+ Cluster)
- Provision a managed Redis cluster (e.g., AWS ElastiCache for Redis).
- Enable Multi-AZ with automatic failover.
- Configure Redis Append-Only File (AOF) persistence so temporary seat locks survive failovers.

### 3. Ingress & Reverse Proxy (Nginx / Cloudflare)
Configure routing rules to terminate SSL/TLS and forward to respective service containers:
- `https://bookmyshow.com` → Customer Frontend (`apps/customer-frontend/dist/` via Nginx or Cloudflare Pages)
- `https://partner.bookmyshow.com` → Theatre Dashboard (`apps/theatre-dashboard/dist/`)
- `https://admin.bookmyshow.com` → Super Admin Console (`apps/admin-dashboard/dist/`)
- `https://api.bookmyshow.com` → Node.js Express Gateway (`apps/backend` on `:5000`)
- `https://api.bookmyshow.com/socket.io` → WebSocket upgrade proxy to backend cluster

### 4. Production Environment Secrets
Ensure the following variables are injected via Kubernetes Secrets or Cloud Secrets Manager:
- `NODE_ENV=production`
- `MONGODB_URI`: Production connection string with TLS and replica set parameters.
- `REDIS_URL`: Production Redis TLS endpoint.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: High-entropy 64-character random cryptographic keys.
- `COOKIE_SECURE=true`: Enforces `Secure` flag on refresh token cookies.
- `COOKIE_SAME_SITE=strict`: Prevents cross-site request forgery.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`: Live production credentials from Razorpay Dashboard.
- `EMAIL_PROVIDER=resend` (or `smtp` with credentials).
- `SMS_PROVIDER=fast2sms` (or `twilio` with account credentials).
- `WHATSAPP_PROVIDER=whatsapp` with Meta Business Cloud API access tokens.

---

## 3. Operational Monitoring & Observability

- **Liveness Probe**: `GET /api/v1/health/live` (Checks HTTP process responsive).
- **Readiness Probe**: `GET /api/v1/health/ready` (Validates active connection to MongoDB and Redis).
- **Prometheus Telemetry**: `GET /api/v1/health/metrics` with `X-Metrics-Token` header.
- **Structured JSON Logging**: Pino logger outputs structured JSON logs to stdout for aggregation into Datadog, Grafana Loki, or AWS CloudWatch.

