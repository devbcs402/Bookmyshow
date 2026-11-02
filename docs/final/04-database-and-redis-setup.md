# Database & Redis Setup Guide
## BookMyShow Multi-Theatre Ticket Booking Platform

This document covers MongoDB and Redis configuration, schema models, replica sets, connection pools, and containerized deployment.

---

## 1. MongoDB Setup & Architecture

### Permanent Source of Truth
MongoDB 7.0 acts as the permanent system-of-record for:
- Users & Auth Sessions (`users`, `refresh_tokens`, `sessions`)
- Multi-Tenant Theatre Complexes & Branches (`theatres`, `theatre_partners`, `branches`, `cities`)
- Auditorium Specs & Layouts (`screens`, `seating_layouts`, `seats`, `seat_categories`)
- Master Movie Catalog (`movies`, `genres`, `languages`)
- Published Show Schedules & Tiered Pricing (`shows`, `show_pricing`)
- Booking Records & Tickets (`bookings`)
- Razorpay Payments, Gateway Events & Refunds (`payments`, `payment_events`, `refunds`)
- Omnichannel Delivery Logs (`notifications`)
- Immutable Administrative Audit Trail (`audit_logs`)

### Mongoose Connection Pool Configuration
Located in `apps/backend/src/config/database.js`:
- `maxPoolSize`: 50 connections
- `minPoolSize`: 5 connections
- `serverSelectionTimeoutMS`: 5000 ms
- `socketTimeoutMS`: 45000 ms
- `autoIndex`: Enabled in development; disabled in production to optimize startup latency

### Required MongoDB Indexes
The application utilizes key compound and geospatial indexes:
- Geospatial Search: `Theatre.index({ location: '2dsphere' })`
- Unique Seat Identity: `Seat.index({ screenId: 1, layoutVersion: 1, seatLabel: 1 }, { unique: true })`
- Show Collision Detection: `Show.index({ screenId: 1, startTime: 1, endTime: 1 })`
- Booking Concurrency Control: `Booking.index({ showId: 1, 'seats.seatId': 1, status: 1 })`

---

## 2. Redis Setup & Distributed Concurrency Architecture

### Role of Redis 7.2
Redis acts as the high-throughput distributed memory tier for:
1. **Atomic Multi-Seat Temporary Locking**:
   - Executed via custom single-threaded Lua script (`ACQUIRE_MULTI_SEAT_LOCKS_LUA`).
   - Uses `SET key val EX 300 NX` semantics to ensure that no two customers can obtain a lock on the same seat.
   - 5 to 10-minute TTL with renewal ceiling.
   - Atomic release via compare-and-delete Lua script (`RELEASE_MULTI_SEAT_LOCKS_LUA`).
2. **Socket.IO Redis Adapter**:
   - Broadcasts real-time seat lock state transitions across horizontally scaled backend nodes (`show:<showId>`).
3. **Sliding-Window Rate Limiting**:
   - IP-based and user-based throttling protecting authentication and payment endpoints against credential stuffing and brute force.
4. **BullMQ Background Queues**:
   - Asynchronous job execution for email, SMS, and WhatsApp dispatch with exponential backoff retries.

---

## 3. Docker Compose Local Setup

To run MongoDB and Redis as background services on your workstation:

```bash
# Start MongoDB & Redis containers
docker compose up -d mongodb redis

# Check container health status
docker compose ps

# View live Redis logs
docker compose logs -f redis

# View live MongoDB logs
docker compose logs -f mongodb

# Stop containers
docker compose down
```

### Docker Volume Persistence
- `mongodb_data`: Mounted to `/data/db` ensuring permanent database persistence across container restarts.
- `redis_data`: Mounted to `/data` with `--appendonly yes` enabled for write-ahead log persistence.

