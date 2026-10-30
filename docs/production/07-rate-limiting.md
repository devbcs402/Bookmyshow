# Distributed Rate Limiting, Abuse Prevention & Store Architecture
**Document Reference**: `docs/production/07-rate-limiting.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Principal Backend Architect, Security Engineer  
**Status**: APPROVED  

---

## 1. Overview & Multi-Pod Scalability

In a multi-replica container deployment (e.g. Kubernetes, AWS ECS), using a default in-memory rate limiter is fundamentally flawed:
- An attacker can rotate requests across pods, effectively multiplying the allowed request volume by the number of replica instances.
- State is lost when pods restart or auto-scale.

The BookMyShow backend provides a high-performance **Redis-backed distributed rate limiter** ([`RedisRateLimitStore`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/middlewares/rate-limit.middleware.js)) that tracks request counts centrally in Redis with atomic Lua scripts, while maintaining a transparent in-memory fallback for offline test environments.

---

## 2. Store Implementation & Atomic Lua Scripts

The Redis store executes an atomic Lua script to ensure race-condition-free increments and TTL updates:

```lua
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
```

### Key Advantages:
1. **Single Round-Trip**: Combines `INCR`, conditional `PEXPIRE`, and `PTTL` in a single evaluation.
2. **Atomic Consistency**: Multiple concurrent requests from the same client IP or user ID cannot race between increment and expiration.
3. **Graceful Fallback**: If Redis temporarily experiences a network partition, the store seamlessly degrades to in-memory tracking without dropping legitimate user traffic.

---

## 3. Tiered Rate Limiting Matrix

| Limiter Name | Key Prefix | Time Window | Max Allowed | Target Routes & Endpoints |
| :--- | :--- | :--- | :--- | :--- |
| `globalRateLimiter` | `rl:global` | 15 Minutes | 300 requests | Mounted globally on all `/api/v1` traffic |
| `authRateLimiter` | `rl:auth` | 15 Minutes | 15 requests | `POST /api/v1/auth/login`, `POST /api/v1/auth/register` |
| `otpRateLimiter` | `rl:otp` | 10 Minutes | 5 requests | `POST /api/v1/auth/otp/send`, `POST /api/v1/auth/otp/verify` |
| `passwordResetLimiter` | `rl:pwreset` | 15 Minutes | 5 requests | `POST /api/v1/auth/password/forgot`, `POST /api/v1/auth/password/reset` |
| `seatLockLimiter` | `rl:seatlock` | 1 Minute | 30 requests | `POST /api/v1/shows/:showId/seat-locks`, `PATCH .../renew` |
| `bookingLimiter` | `rl:booking` | 1 Minute | 20 requests | `POST /api/v1/bookings` |
| `paymentLimiter` | `rl:payment` | 1 Minute | 30 requests | `POST /api/v1/payments/create-order`, `POST /payments/verify` |
| `searchRateLimiter` | `rl:search` | 1 Minute | 120 requests | `GET /api/v1/search/suggestions`, `GET /api/v1/discovery/location` |

---

## 4. HTTP 429 Response Specification

When a client breaches rate limit thresholds, the middleware responds with standard `Retry-After` headers and a structured error envelope:

### HTTP Response Headers
```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 15
RateLimit-Remaining: 0
RateLimit-Reset: 840
Retry-After: 840
X-Request-ID: c9d05be1-5f21-4fae-9ef7-29ab346e01a8
Content-Type: application/json
```

### JSON Error Body
```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many authentication attempts. Please wait 15 minutes.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "details": null,
  "requestId": "c9d05be1-5f21-4fae-9ef7-29ab346e01a8",
  "timestamp": "2026-10-30T11:29:00.000Z"
}
```

