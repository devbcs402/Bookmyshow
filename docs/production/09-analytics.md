# Real Platform Analytics, Financial Accounting & Tenant Reporting Module
**Document Reference**: `docs/production/09-analytics.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Principal Backend Architect, Financial Systems Architect  
**Status**: APPROVED  

---

## 1. Overview & Real-Data Architecture

The Analytics and Business Intelligence module ([`apps/backend/src/modules/analytics/`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/analytics/)) aggregates real platform performance data across users, theatres, movies, shows, seat bookings, and Razorpay transactions.

### Core Architecture Rules:
1. **Zero Fake Metrics**: All metrics are computed dynamically via optimized MongoDB aggregation pipelines directly over transactional collections.
2. **Strict Financial Accounting Separation**:
   - `Gross Booking Value (GBV)`: Total nominal value of all attempted bookings.
   - `Captured Payment Value`: Actual realized customer funds from Razorpay `CONFIRMED` bookings.
   - `Refunded Value`: Funds refunded back to customers due to cancellations.
   - `Platform Commission`: Platform revenue retained via convenience fees.
   - `Theatre Partner Settlement`: Net funds payable to theatre owners (`Captured - Commission - Refunds`).
   - `Net Platform Revenue`: Pure recognized platform revenue (`platformCommission`).
   - **Pending, expired, or failed bookings are never counted as revenue**.
3. **Multi-Tenant Isolation**: Theatre owners are strictly isolated by their `partnerId`. An owner can never query or extrapolate another partner's ticket sales, occupancy rates, or settlement figures.
4. **Redis Result Caching**: High-volume aggregate endpoints cache safe results in Redis with a 300-second (5-minute) TTL to eliminate expensive recurring database scans.

---

## 2. Date Filter System & Time Boundaries

The module supports standardized time ranges with UTC boundary calculations ([`computeDateBoundaries`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/analytics/analytics.repository.js)):

| Filter Value | Time Window Computed |
| :--- | :--- |
| `today` | Start of UTC day (`00:00:00.000Z`) to present instant |
| `yesterday` | Start of yesterday (`00:00:00.000Z`) to end of yesterday (`23:59:59.999Z`) |
| `7d` *(default)* | Exactly 7 * 24 hours prior to present instant |
| `30d` | Exactly 30 * 24 hours prior to present instant |
| `this_month` | 1st day of current UTC month to present instant |
| `prev_month` | 1st day of previous month to last millisecond of previous month |
| `custom` | Validated ISO 8601 `startDate` and `endDate` query parameters |

---

## 3. Super Admin Analytics APIs

Guarded by `authenticate, authorizeRoles(Roles.SUPER_ADMIN, Roles.ADMIN)`:

### 3.1 Platform KPI Overview: `GET /api/v1/admin/analytics/overview`
- **Output**: Registered user count, active user count, total theatres, approved active theatres, published shows, total/confirmed/cancelled bookings, gross booking value, captured revenue, refunds, and net platform revenue.
- **Example Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Platform analytics overview retrieved successfully",
  "data": {
    "period": { "timeRange": "7d", "startDate": "2026-10-23T11:30:00.000Z", "endDate": "2026-10-30T11:30:00.000Z" },
    "platform": {
      "totalUsers": 1420,
      "activeUsers": 1380,
      "totalTheatres": 45,
      "activeTheatres": 42,
      "totalMovies": 28,
      "publishedShows": 310
    },
    "bookings": {
      "total": 1250,
      "confirmed": 1050,
      "cancelled": 110,
      "expired": 75,
      "failed": 15,
      "ticketsSold": 2840
    },
    "revenue": {
      "currency": "INR",
      "grossBookingValue": 845000,
      "capturedPaymentValue": 710000,
      "refundValue": 74000,
      "platformCommission": 71000,
      "theatreSettlement": 565000,
      "netPlatformRevenue": 71000
    }
  }
}
```

### 3.2 Booking Trends: `GET /api/v1/admin/analytics/bookings`
- Status distribution breakdown, cancellation rate percentage, average seats per booking, and daily volume timeline.

### 3.3 Financial Accounting: `GET /api/v1/admin/analytics/revenue`
- Full monetary breakdown with accounting definitions and daily financial timeline (`gross`, `captured`, `refunded`, `commission`, `settlement`).

### 3.4 Top Performing Movies: `GET /api/v1/admin/analytics/movies?limit=10`
- Ranked by confirmed tickets sold and gross box office revenue.

### 3.5 Top Performing Theatres: `GET /api/v1/admin/analytics/theatres?limit=10`
- Ranked by ticket volume and gross sales.

---

## 4. Theatre Owner Isolated Analytics APIs

Guarded by `authenticate, authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN)`:
Mounted at `/api/v1/theatre-owner/analytics` and `/api/v1/owner/analytics`.

### 4.1 Partner Overview: `GET /api/v1/theatre-owner/analytics/overview`
- **Strict Tenant Boundary**: Only includes records matching `booking.partnerId === req.user.partnerId`.
- **Output**: Active published shows, total bookings, confirmed bookings, cancellations, gross sales, platform fee deductions, and net payable partner settlement.

### 4.2 Partner Booking Trends: `GET /api/v1/theatre-owner/analytics/bookings`
- Status counts and daily confirmed ticket sales for the owner's screens.

### 4.3 Partner Settlement: `GET /api/v1/theatre-owner/analytics/revenue`
- Verified breakdown of gross sales, deducted platform convenience fees, refunded ticket amounts, and final net settlement amount payable to the theatre partner.

