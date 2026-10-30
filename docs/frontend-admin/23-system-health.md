# 23 – System Health and Operational Monitoring

## 1. Infrastructure Telemetry
Mounted under `/api/v1/health`:
- `GET /health`: Checks connectivity to MongoDB cluster and Redis cache ring.
- `GET /health/live`: Liveness check.
- `GET /health/ready`: Readiness check.
- `GET /health/metrics`: Memory RSS, heap usage, CPU usage, and server uptime.

