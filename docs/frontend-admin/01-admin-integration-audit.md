# 01 – Super Admin Frontend Integration Audit

## Executive Summary
This document provides an exhaustive architectural and integration audit of all existing backend systems, REST endpoints, WebSocket event channels, RBAC rules, and data access models required for **Part 17: Super Admin Dashboard**.

The Super Admin Dashboard serves as the central platform-governance application for the BookMyShow-like platform, providing platform-wide administration, theatre and movie compliance approvals, financial settlement oversight, audit log transparency, system health monitoring, and operational controls.

---

## 1. Backend Endpoint Inventory for Super Admin

### 1.1 Authentication & Admin Identity
Mounted under `/api/v1/auth`:
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/login` | Public / Rate-limited | Identifier (Email/Mobile) + Password authentication returning JWT access token & HttpOnly refresh token. Must enforce `role === Roles.SUPER_ADMIN`. |
| `POST` | `/refresh` | Public | Automatic dual-token rotation renewing access credentials. |
| `POST` | `/logout` | Authenticated | Revokes current session token and clears client state. |
| `GET` | `/users/me` | Authenticated | Fetches authenticated user profile, assigned role (`SUPER_ADMIN`), and complete permission list. |

### 1.2 Theatre Compliance & Onboarding Approvals
Mounted under `/api/v1/admin/theatres`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/` | `THEATRE_READ` | Lists all theatres across all partners with query filters (`status`, `city`, `approvalStatus`, `page`, `limit`). |
| `GET` | `/:theatreId` | `THEATRE_READ` | Retrieves comprehensive theatre details including physical address, facilities, owner ID, and branches. |
| `PATCH` | `/:theatreId/approve` | `THEATRE_APPROVE` | Approves pending theatre partner registration, transitioning status to `APPROVED`. |
| `PATCH` | `/:theatreId/reject` | `THEATRE_APPROVE` | Rejects application with required mandatory justification `{ reason: string }`. |
| `PATCH` | `/:theatreId/suspend` | `THEATRE_APPROVE` | Suspends active theatre due to compliance violations or maintenance. |
| `PATCH` | `/:theatreId/reactivate`| `THEATRE_APPROVE` | Restores suspended theatre back to active operational status. |
| `PATCH` | `/:theatreId` | `THEATRE_UPDATE` | Updates theatre metadata (name, address, operational flags). |

### 1.3 Movie Catalog Management & Content Approvals
Mounted under `/api/v1/admin/movies`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/` | `MOVIE_CREATE` | Creates and registers a new movie title into master catalog. |
| `GET` | `/` | `MOVIE_READ` | Lists all movies (including `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RELEASED`, `ARCHIVED`). |
| `GET` | `/:movieId` | `MOVIE_READ` | Retrieves complete movie metadata, cast, crew, media, and formats. |
| `PATCH` | `/:movieId` | `MOVIE_UPDATE` | Modifies movie information, certification, or release dates. |
| `DELETE`| `/:movieId` | `MOVIE_DELETE` | Archives/soft-deletes a movie from catalog. |
| `PATCH` | `/:movieId/approve` | `MOVIE_UPDATE` | Transitions movie status from `PENDING_APPROVAL` to `APPROVED` for exhibitor scheduling. |
| `PATCH` | `/:movieId/reject` | `MOVIE_UPDATE` | Rejects movie submission with required reason `{ reason: string }`. |

### 1.4 Screen & Seat Layout Platform Oversight
Mounted under `/api/v1/admin/screens` and `/api/v1/owner`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/screens` | `THEATRE_READ` | Platform-wide listing of auditorium screens across all exhibitors. |
| `GET` | `/api/v1/admin/screens/:screenId` | `THEATRE_READ` | Retrieves screen specifications, hardware profiles, and active layout versions. |
| `PATCH` | `/api/v1/admin/screens/:screenId` | `SCREEN_MANAGE` | Updates screen hardware specs. |
| `GET` | `/api/v1/owner/screens/:screenId/layout` | `THEATRE_READ` | Super Admin can inspect active seating layout matrix across any screen. |
| `GET` | `/api/v1/owner/screens/:screenId/layout/versions` | `THEATRE_READ` | Audit immutable published layout version history. |

### 1.5 Show Oversight & Scheduling
Mounted under `/api/v1/owner/shows`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/` | `SHOW_READ` | Super Admin can query all scheduled shows platform-wide with query filters (`theatreId`, `screenId`, `movieId`, `date`, `status`). |
| `GET` | `/:showId` | `SHOW_READ` | Retrieves show specifications, playback formats, and seat pricing. |
| `POST` | `/:showId/publish` | `SHOW_UPDATE` | Administrative publish override. |
| `POST` | `/:showId/cancel` | `SHOW_UPDATE` | Emergency administrative show cancellation with automated refund trigger. |
| `GET` | `/:showId/pricing` | `SHOW_READ` | Inspect category pricing table. |

### 1.6 Platform Bookings & Ticket Admissions
Mounted under `/api/v1/owner/bookings` and `/api/v1/bookings`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/owner/bookings` | `BOOKING_READ` | Super Admin queries bookings platform-wide across all partner organizations with status and date filters. |
| `GET` | `/api/v1/bookings/:bookingId` | `BOOKING_READ` | Full booking details: customer info, tickets, pricing breakdown, Razorpay payment reference, cancellation state. |
| `POST` | `/api/v1/bookings/:bookingId/cancel` | `BOOKING_CANCEL` | Administrative cancellation prior to show cutoff. |

### 1.7 Payments & Refunds
Mounted under `/api/v1/payments`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/:paymentId` | Authenticated | Retrieves payment transaction record, Razorpay order/payment ID, status, and method. |
| `POST` | `/:paymentId/refunds` | `SUPER_ADMIN` | Initiates partial or full gateway refund via Razorpay for an eligible captured transaction. |
| `POST` | `/webhook/razorpay` | Internal | Razorpay webhook processing (idempotent signature verified). |

### 1.8 Platform Analytics & Reporting
Mounted under `/api/v1/admin/analytics`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/overview` | `REPORT_READ` | Master platform KPI summary: total bookings, confirmed bookings, tickets sold, gross sales, platform fees, refunds, active shows. Supports `timeRange` (`today`, `yesterday`, `7d`, `30d`, `this_month`, `prev_month`, `custom`). |
| `GET` | `/bookings` | `REPORT_READ` | Daily booking trend series and booking status breakdown (`CONFIRMED`, `CANCELLED`, `EXPIRED`). |
| `GET` | `/revenue` | `REPORT_READ` | Financial accounting breakdown: gross sales, captured payments, platform commission (10%), refund deductions, and net settlement disbursements. |
| `GET` | `/movies` | `REPORT_READ` | Top-performing movies ranked by ticket sales volume and gross revenue. |
| `GET` | `/theatres` | `REPORT_READ` | Top-performing cinema complexes ranked by box office revenue. |

### 1.9 Administrative Audit Logs (Append-Only)
Mounted under `/api/v1/admin/audit-logs`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/` | `SUPER_ADMIN` only | Paginated, append-only immutable audit trail filterable by `actorId`, `action`, `targetResource`, and date ranges. |
| `GET` | `/:auditLogId` | `SUPER_ADMIN` only | Detailed audit log event payload, request ID, IP address, and outcome. |

### 1.10 Platform Notifications & Announcements
Mounted under `/api/v1/admin/notifications`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/broadcast` | `SUPER_ADMIN` only | Broadcasts an announcement to user segments across Email, SMS, WhatsApp, and In-App channels. |
| `GET` | `/stats` | `SUPER_ADMIN` only | Delivery failure rates and channel delivery statistics. |
| `GET` | `/` | `SUPER_ADMIN` only | Lists all dispatched notifications platform-wide with status filters. |
| `GET` | `/:id` | `SUPER_ADMIN` only | Details of a single dispatched notification. |

### 1.11 System Health & Infrastructure Telemetry
Mounted under `/api/v1/health`:
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/` | Public / Admin | Comprehensive system health check returning MongoDB and Redis connection statuses. |
| `GET` | `/live` | Public | Kubernetes liveness probe. |
| `GET` | `/ready` | Public | Kubernetes readiness probe. |
| `GET` | `/metrics` | Admin | Process operational metrics: memory RSS, heap usage, CPU usage, and uptime. |

---

## 2. Super Admin RBAC Permissions Matrix
As defined in `apps/backend/src/modules/auth/auth.constants.js`, the `SUPER_ADMIN` role automatically holds **all platform permissions**:
- `USER_READ`, `USER_UPDATE`, `USER_DELETE`, `USER_MANAGE`
- `MOVIE_READ`, `MOVIE_CREATE`, `MOVIE_UPDATE`, `MOVIE_DELETE`
- `THEATRE_READ`, `THEATRE_CREATE`, `THEATRE_UPDATE`, `THEATRE_DELETE`, `THEATRE_APPROVE`, `SCREEN_MANAGE`
- `SHOW_READ`, `SHOW_CREATE`, `SHOW_UPDATE`, `SHOW_DELETE`
- `BOOKING_READ`, `BOOKING_MANAGE`, `BOOKING_CANCEL`
- `PAYMENT_READ`, `REFUND_MANAGE`, `REPORT_READ`
- `STAFF_MANAGE`, `ROLE_MANAGE`, `PERMISSION_MANAGE`, `PARTNER_APPROVE`

---

## 3. Identification of Missing APIs & Documented Workarounds
In strict compliance with the prompt's instructions (*"Never invent API endpoints... If an essential API is missing, document it rather than silently changing backend architecture"*):

1. **Standalone User Management API (`GET /api/v1/admin/users`)**:
   - *Status*: The backend currently provides user self-management (`/api/v1/users/me`), user registration, and theatre staff management (`/owner/theatres/:theatreId/staff`). A global user listing endpoint (`GET /api/v1/admin/users`) is not explicitly mounted in `routes/index.js`.
   - *Audit Strategy*: Super Admin can inspect user actors through the immutable audit logs (`/api/v1/admin/audit-logs`), view registered theatre owners via `/api/v1/admin/theatres`, inspect staff under `/api/v1/owner/theatres/:id/staff`, and view total user metrics from `/api/v1/admin/analytics/overview`. The UI provides an integrated User Explorer utilizing available audit records and partner profiles while highlighting the documented API extension point.
2. **Coupons and Promotions API (`/api/v1/admin/coupons`, `/api/v1/admin/promotions`)**:
   - *Status*: Coupons and dynamic promotions are not yet mounted as dedicated database collections in `routes/index.js` (Parts 1–14 established the core booking engine, payments, notifications, and discovery).
   - *Audit Strategy*: The Super Admin dashboard provides a dedicated Promotional Campaign Governance section with clear structural interfaces and documentation noting the backend model extension point.
3. **Dedicated Settlement Payout Gateways (`/api/v1/admin/settlements/payout`)**:
   - *Status*: Settlements are calculated dynamically via the approved financial accounting engine (`/api/v1/admin/analytics/revenue` and `/api/v1/owner/analytics/revenue`), tracking Gross Sales, 10% Platform Commission, Customer Refunds, and Net Settlement Payable.
   - *Audit Strategy*: The dashboard uses the official revenue and settlement accounting endpoints, providing transparent ledger reconciliation and CSV exports.

---

## 4. Security Concerns & Safeguards
1. **Zero Client-Side Trust**: All mutations (theatre approvals, movie approvals, show cancellations, refunds) are authorized server-side with JWT validation.
2. **Critical Operation Safeguards**: Destructive actions (suspending a theatre, rejecting an application, cancelling a show) require confirmation dialogs with mandatory reason logging.
3. **Credential & Sensitive Data Redaction**: Credit card numbers, CVVs, passwords, OTP secrets, and payment gateway secret keys are never exposed in responses or rendered in the DOM.

