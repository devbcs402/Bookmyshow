# Centralized Production Logging, Correlation Tracing & Observability
**Document Reference**: `docs/production/03-logging-and-monitoring.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior Backend Architect, DevOps Engineer, Security Engineer  
**Status**: APPROVED  

---

## 1. Observability Architecture Overview

The BookMyShow backend utilizes **Pino**—an ultra-fast, low-overhead JSON logger designed specifically for high-throughput Node.js microservices and modular monoliths.

In adherence to Twelve-Factor principles (Factor XI: Logs), logs are treated as event streams written directly to `process.stdout` and `process.stderr`. This decouples the Node.js application process from log routing, disk rotation, and persistent storage infrastructure.

```
+-------------------------------------------------------------+
|                      Incoming HTTP / WS                     |
+-------------------------------------------------------------+
                              |
                     [ requestIdMiddleware ]
                              | (generates x-request-id UUID)
                              v
                   [ Express Route Handlers ]
                              |
                              +---> [ Logger: Incoming Request (debug) ]
                              |
                    [ Business Services / DB ]
                              | (attaches context, duration, errors)
                              v
                  [ res.on('finish') Interceptor ]
                              |
                              +---> [ Logger: Request Finished (info/warn/error) ]
                              |
                     [ JSON to stdout ]
                              |
            +-----------------+-----------------+
            |                                   |
    (Container Runtime)               (Centralized Aggregator)
 Docker / Kubernetes stdout          Fluentd / Datadog / CloudWatch
```

---

## 2. Structured JSON Log Specification

In non-development environments (`NODE_ENV=production` or `staging`), every log output is emitted as a single-line, valid JSON record with UTC ISO timestamps.

### 2.1 Standard Request Log Schema
```json
{
  "level": 30,
  "time": "2026-10-30T11:20:45.123Z",
  "pid": 1,
  "hostname": "bms-api-pod-79bc9f49cb-4w8xl",
  "msg": "Request Finished",
  "requestId": "9c8a14b5-82e4-4c80-bd91-03914a19f972",
  "method": "POST",
  "url": "/api/v1/bookings",
  "statusCode": 201,
  "durationMs": 48,
  "ip": "203.0.113.195",
  "userId": "65f1a2b3c4d5e6f7a8b9c011"
}
```

### 2.2 Error Log Schema
```json
{
  "level": 50,
  "time": "2026-10-30T11:21:02.842Z",
  "pid": 1,
  "hostname": "bms-api-pod-79bc9f49cb-4w8xl",
  "msg": "HTTP Request Error",
  "requestId": "5e172288-06fc-4632-9cb7-7813a30c5eef",
  "method": "POST",
  "url": "/api/v1/payments/verify",
  "statusCode": 400,
  "errorCode": "INVALID_SIGNATURE",
  "errorMessage": "Razorpay payment signature mismatch detected",
  "stack": "Error: Razorpay payment signature mismatch detected\n    at PaymentService.verifyPayment (/app/src/modules/payments/payment.service.js:142:15)..."
}
```

---

## 3. Security Redaction & PII Protection

To comply with PCI-DSS, GDPR, and Indian Digital Personal Data Protection (DPDP) Act requirements, sensitive information is automatically intercepted and masked with `[REDACTED]` before serialization.

Configured in [`apps/backend/src/config/logger.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/config/logger.js):
```javascript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-razorpay-signature"]',
    'req.headers["x-webhook-signature"]',
    'req.body.password',
    'req.body.confirmPassword',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.token',
    'req.body.refreshToken',
    'req.body.otp',
    'req.body.cvv',
    'req.body.cardNumber',
    'req.body.upiPin',
    'req.body.razorpay_signature',
    'req.body.razorpay_payment_id',
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'otp',
    'secret',
    'cvv',
    'cardNumber',
    'upiPin',
    'razorpay_signature'
  ],
  censor: '[REDACTED]'
}
```

---

## 4. Distributed Request Correlation (`X-Request-ID`)

Every incoming HTTP request is assigned a unique UUIDv4 by [`requestIdMiddleware`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/middlewares/request-id.middleware.js). If an upstream load balancer provides an `X-Request-ID` header, that ID is preserved across the entire execution context:
1. Injected into `req.id`.
2. Appended to all application log events.
3. Returned in the HTTP response header `X-Request-ID`.
4. Embedded in all structured error envelopes (`ErrorEnvelope.requestId`).
5. Propagated to background jobs and notification messages.

---

## 5. Log Shipping & Aggregation Strategy

### 5.1 Container Log Ingestion
Containers run on Amazon ECS, EKS, or Google Cloud Run. Node.js writes plain JSON to `stdout`.

### 5.2 Log Shipper Deployment Options
1. **AWS CloudWatch Container Insights**:
   - FluentBit daemonset collects container logs, parses JSON timestamps, and routes to `/aws/containerinsights/bookmyshow/application`.
2. **Datadog Agent**:
   - Sidecar container streams logs directly to Datadog Log Management with automated facet extraction for `statusCode`, `durationMs`, `userId`, `errorCode`.
3. **Grafana Loki & Promtail**:
   - Promtail tails Docker container logs, labels by pod name and environment, and indexes into Loki for fast querying in Grafana.

---

## 6. Alerting Thresholds & Operational Metrics

| Metric / Alarm | Trigger Condition | Severity | Notification Channel |
| :--- | :--- | :--- | :--- |
| **5xx Error Rate** | > 1.5% of total requests over 5 minutes | **P1 (Critical)** | PagerDuty / Slack #ops-alerts |
| **P99 Request Latency** | > 1,500ms over 5 minutes | **P2 (Major)** | Slack #backend-eng |
| **DB Latency Spike** | MongoDB ping latency > 200ms | **P1 (Critical)** | PagerDuty |
| **Redis Health Degraded** | Redis ping failure or latency > 100ms | **P1 (Critical)** | PagerDuty |
| **Dead-Letter Queue Growth** | Unprocessed notifications > 50 | **P3 (Warning)** | Email / Slack #notification-alerts |
| **Payment Signature Failures** | > 10 signature validation failures in 1 min | **P1 (Security)** | Security Incident Response Team |

