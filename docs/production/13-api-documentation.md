# OpenAPI / Swagger 3.0 Documentation Synchronization & API Versioning
**Document Reference**: `docs/production/13-api-documentation.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Principal API Architect, DevOps Engineer  
**Status**: APPROVED  

---

## 1. Overview & Single Source of Truth

The BookMyShow backend provides interactive OpenAPI 3.0 documentation generated dynamically from JSDoc declarations across all route controllers ([`apps/backend/src/docs/swagger.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/docs/swagger.js)).

Interactive Swagger UI is served under `/api/v1/docs` during development and staging. In locked-down production environments, public UI access can be deactivated via `ENABLE_SWAGGER=false`.

---

## 2. Global API Conventions

### 2.1 URL Versioning Prefix
All API routes are prefixed by `/api/v1`:
- Public Catalog: `/api/v1/movies`, `/api/v1/theatres`, `/api/v1/cities`, `/api/v1/shows`
- Customer Services: `/api/v1/auth`, `/api/v1/users`, `/api/v1/bookings`, `/api/v1/payments`, `/api/v1/notifications`
- Search & Discovery: `/api/v1/search`, `/api/v1/recommendations`, `/api/v1/discovery`
- Theatre Partner Management: `/api/v1/owner/theatres`, `/api/v1/owner/screens`, `/api/v1/owner/shows`, `/api/v1/theatre-owner/analytics`
- Super Admin Operations: `/api/v1/admin/movies`, `/api/v1/admin/theatres`, `/api/v1/admin/audit-logs`, `/api/v1/admin/analytics`
- Infrastructure Probes: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health/metrics`

---

## 3. Security Schemes & Authentication

Every protected route declares the `BearerAuth` security scheme:
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Pass standard Authorization Bearer header: Bearer <jwt_access_token>
```

---

## 4. Schema Synchronization Matrix

| Domain Module | OpenAPI Tags | JSDoc Coverage | Schema Models |
| :--- | :--- | :--- | :--- |
| **Authentication & Users** | `Auth`, `Users` | 100% | `User`, `LoginResponse`, `TokenPair` |
| **Movie Management** | `Movies`, `Genres`, `Languages` | 100% | `Movie`, `Genre`, `Language` |
| **Theatres & Branches** | `Theatres`, `Branches` | 100% | `Theatre`, `Branch`, `StaffAssignment` |
| **Screens & Seat Layouts** | `Screens`, `SeatingLayout` | 100% | `Screen`, `SeatGrid`, `CategoryTiers` |
| **Show Scheduling** | `Shows` | 100% | `Show`, `ShowPricing` |
| **Seat Availability & Locking**| `Seat Availability & Locks` | 100% | `SeatAvailabilityResponse`, `LockToken` |
| **Booking Engine** | `Bookings` | 100% | `Booking`, `BookingSnapshot`, `LineItem` |
| **Razorpay Payments** | `Payments` | 100% | `RazorpayOrder`, `PaymentVerification`, `Refund` |
| **Notification Subsystem** | `Notifications` | 100% | `Notification`, `Preference` |
| **Search & Discovery** | `Discovery & Recommendations` | 100% | `SearchSuggestions`, `Recommendation` |
| **Audit Logging Subsystem** | `Audit Logs` | 100% | `AuditLogEntry` |
| **Analytics & BI** | `Analytics` | 100% | `AnalyticsOverview`, `BookingTrend`, `RevenueReport` |
| **Infrastructure & Health** | `Infrastructure` | 100% | `HealthResponse`, `MetricsResponse` |

