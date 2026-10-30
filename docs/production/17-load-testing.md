# Repeatable Load Testing, Stress Profiling & Concurrency Benchmarking
**Document Reference**: `docs/production/17-load-testing.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Performance Engineering Lead, Distributed Systems Architect  
**Status**: APPROVED  

---

## 1. Overview & Load Testing Philosophy

Movie ticketing platforms face dramatic traffic volatility: quiet baseline periods followed by extreme demand spikes during opening-day sales for major cinematic releases.

Load testing validates that the system maintains low response latencies (p95 < 200ms) and zero double-booking anomalies under sustained concurrent demand.

### Rules of Engagement:
1. **Isolated Non-Production Environment**: Load tests must run exclusively against dedicated test/staging clusters. Never execute load tests against live production customer databases.
2. **Mock Payment Gateways**: Razorpay transactions are tested using mock sandbox/test mode credentials. Real credit cards or live UPI rails are strictly prohibited.
3. **Reproducible Test Profiles**: Load profiles are codified using declarative **Artillery** configurations in [`apps/backend/load-tests/`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/load-tests/).

---

## 2. Load Testing Scenarios

### 2.1 Movie Discovery & Auto-Complete Cache Stress (`artillery-search-load.yml`)
- **Objective**: Stresses read-heavy movie catalog queries, regex/text search, and Redis autocomplete cache invalidation.
- **Traffic Pattern**: Ramps from 10 to 50 concurrent requests/second over 180 seconds (~9,000 total requests).
- **Target Metrics**:
  - p50 Latency: `< 20ms`
  - p95 Latency: `< 50ms`
  - p99 Latency: `< 120ms`
  - Error Rate: `0.00%`

---

### 2.2 High-Concurrency Seat Locking Rush (`artillery-seat-locking-load.yml`)
- **Objective**: Simulates 100 concurrent users competing for identical high-demand seats within a 30-second burst.
- **Verification Criterion**:
  - Exactly 1 user acquires the lock (`200 OK`).
  - Remaining 99 competing users receive `409 Conflict` (or `SEAT_ALREADY_LOCKED`).
  - Zero double locks granted in Redis.
  - Zero unhandled exceptions or connection timeouts.

---

### 2.3 End-to-End Booking Lifecycle (`artillery-booking-flow.yml`)
- **Objective**: Simulates complete customer journey: Screen Layout -> Seat Lock -> Pending Booking -> Razorpay Order Creation.
- **Throughput**: 15 full booking lifecycles per second sustained for 60 seconds.

---

## 3. How to Execute Load Tests

Ensure the local backend or staging container is running, then execute Artillery from the CLI:

```bash
# 1. Install Artillery CLI globally or locally
npx artillery --version

# 2. Run Movie Discovery Load Test
npx artillery run apps/backend/load-tests/artillery-search-load.yml

# 3. Run Seat Locking Concurrency Rush
npx artillery run apps/backend/load-tests/artillery-seat-locking-load.yml

# 4. Run Full Booking Flow Test
npx artillery run apps/backend/load-tests/artillery-booking-flow.yml
```

