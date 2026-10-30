# Application Monitoring, Health Probes & Operational Metrics
**Document Reference**: `docs/production/04-health-checks.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Backend Architect, DevOps Engineer  
**Status**: APPROVED  

---

## 1. Overview

Production container orchestrators (Kubernetes, Amazon ECS, Google Cloud Run) require specialized HTTP probes to determine container lifecycle events:
- Whether the application process is running (Liveness).
- Whether the container is prepared to receive ingress traffic (Readiness).
- Operational telemetry and memory saturation checks.

The BookMyShow backend provides four dedicated infrastructure endpoints mounted on `/api/v1/health` (or `/health`).

---

## 2. Health Endpoints Specification

### 2.1 General Health Check: `GET /api/v1/health`
Provides overall system health without exposing sensitive database URIs, passwords, or internal network topology.

- **HTTP Status**: 
  - `200 OK` when all dependencies are healthy.
  - `503 Service Unavailable` when one or more dependencies are degraded.
- **Response Payload**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "System is fully operational",
  "data": {
    "status": "HEALTHY",
    "environment": "production",
    "uptimeSeconds": 14250,
    "timestamp": "2026-10-30T11:25:00.000Z",
    "process": {
      "nodeVersion": "v20.18.0",
      "platform": "linux",
      "memoryUsageMB": {
        "rss": 112,
        "heapTotal": 64,
        "heapUsed": 45
      }
    },
    "dependencies": {
      "database": {
        "status": "connected",
        "isHealthy": true,
        "latencyMs": 4
      },
      "redis": {
        "status": "ready",
        "isHealthy": true,
        "latencyMs": 1
      }
    }
  }
}
```

---

### 2.2 Kubernetes Liveness Probe: `GET /api/v1/health/live`
Confirms the Node.js event loop is operational and responding to HTTP requests.

- **Purpose**: Kubernetes restarts deadlocked or out-of-memory pods based on liveness failure.
- **Fail-Safe Design**: This probe does **NOT** check external dependencies (MongoDB/Redis) to prevent cascading pod restarts during transient database network blips.
- **HTTP Status**: Always `200 OK`.
- **Response Payload**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service is alive",
  "data": {
    "status": "UP",
    "uptimeSeconds": 14250,
    "timestamp": "2026-10-30T11:25:00.000Z"
  }
}
```

---

### 2.3 Kubernetes Readiness Probe: `GET /api/v1/health/ready`
Confirms that mandatory external state stores (MongoDB replica set and Redis cluster) are actively connected and ready to process traffic before traffic is routed to the pod.

- **Purpose**: Prevents new pods from accepting requests during cold-start or during dependency network partitions.
- **HTTP Status**:
  - `200 OK` (`READY`)
  - `503 Service Unavailable` (`NOT_READY`)
- **Response Payload**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service is ready to accept traffic",
  "data": {
    "status": "READY",
    "timestamp": "2026-10-30T11:25:00.000Z",
    "checks": {
      "database": true,
      "redis": true
    }
  }
}
```

---

### 2.4 Internal Process Metrics: `GET /api/v1/health/metrics`
Exposes process-level resource consumption (memory RSS, V8 heap usage, CPU user/system time).

- **Security Control**: In production, requests must present a valid `X-Metrics-Token` header matching `INTERNAL_METRICS_TOKEN` from the environment.
- **Response Payload**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operational metrics retrieved successfully",
  "data": {
    "uptimeSeconds": 14250,
    "timestamp": "2026-10-30T11:25:00.000Z",
    "process": {
      "pid": 1,
      "nodeVersion": "v20.18.0",
      "platform": "linux",
      "arch": "x64"
    },
    "memory": {
      "rssMB": 112,
      "heapTotalMB": 64,
      "heapUsedMB": 45,
      "externalMB": 8
    },
    "cpu": {
      "userMicroseconds": 384000,
      "systemMicroseconds": 74000
    }
  }
}
```

---

## 3. Kubernetes Deployment Manifest Configuration

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 2
```

