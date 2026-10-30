# Production Docker Architecture, Container Security & Deployment Runbook
**Document Reference**: `docs/production/14-docker-deployment.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior DevOps Engineer, Security Engineer  
**Status**: APPROVED  

---

## 1. Overview & Multi-Stage Architecture

The BookMyShow backend utilizes a lightweight, hardened **Multi-Stage Dockerfile** ([`apps/backend/Dockerfile`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/Dockerfile)) based on `node:20-alpine`.

### Architecture Stages
1. **Stage 1 (`dependencies`)**: Installs only production dependencies (`npm ci --omit=dev`), discarding compilers and test packages.
2. **Stage 2 (`runner`)**: Produces a minimal production image (~140MB), copying only runtime node modules and application source code.

---

## 2. Container Security & Least Privilege

1. **Non-Root Execution**:
   - The container creates and switches to a dedicated non-root system user (`nodejs`, UID 1001, GID 1001).
   - Prohibits container escape vulnerabilities and unauthorized root filesystem writes.
2. **Alpine Base Hardening**:
   - Strips package managers and unnecessary network utilities from the final image.
3. **No Embedded Secrets**:
   - Zero hardcoded credentials or `.env` files in images. Enforced by `.dockerignore`.
4. **Native Container Health Probe**:
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
     CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health/live || exit 1
   ```

---

## 3. Production Deployment Topologies

```
                             [ Cloudflare / Route 53 ]
                                         |
                                         v
                         [ AWS ALB / Ingress Controller ]
                         (TLS Termination, WAF, DDoS)
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             [ Pod 1: BMS API ]                  [ Pod 2: BMS API ]
             (Node.js 20 Alpine)                 (Node.js 20 Alpine)
                       |                                   |
                       +-----------------+-----------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
     [ MongoDB Atlas Cluster ]                           [ AWS ElastiCache Redis ]
 (Primary + 2 Secondaries Replica)                   (Sentinel / Multi-AZ Cluster)
```

---

## 4. Local Orchestration (`docker-compose.yml`)

Developers can start the full distributed stack with a single command from root:
```bash
docker compose up -d
```

### Services Provisioned:
1. `backend`: Express API listening on `http://localhost:5000` with live health check.
2. `mongodb`: MongoDB 7.0 engine on `localhost:27017` with persistent named volume `mongodb_data`.
3. `redis`: Redis 7.2 Alpine on `localhost:6379` with Append-Only File (`--appendonly yes`) persistence on volume `redis_data`.

