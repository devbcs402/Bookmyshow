# 01 – Theatre Partner Frontend Integration Audit

## Executive Summary
This document provides an exhaustive architectural and integration audit of all existing backend systems, REST endpoints, WebSocket event channels, RBAC rules, and data access models required for **Part 16: Theatre Partner Dashboard**.

The Theatre Partner Dashboard serves three primary enterprise personas:
1. **THEATRE_OWNER**: Top-level partner organization owner with complete control over theatres, branches, screens, layouts, shows, pricing, staff assignment, revenue settlement reports, and financial audit data.
2. **THEATRE_MANAGER**: Operational manager responsible for daily show scheduling, screen layout drafts, live booking audits, customer admission inquiries, and staff oversight.
3. **THEATRE_STAFF**: Box-office and floor operators with read-only schedule visibility, ticket verification, and booking lookup access.

---

## 1. Backend Endpoint Inventory for Theatre Partners

### 1.1 Authentication & Partner Identity
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/theatre-owner/register` | Public / Rate-limited | Partner onboarding with business details (GSTIN, PAN, Business Address). Requires SUPER_ADMIN approval. |
| `POST` | `/api/v1/auth/login` | Public / Rate-limited | Identifier (Email/Mobile) + Password authentication returning JWT access token & HttpOnly refresh token. |
| `POST` | `/api/v1/auth/refresh` | Public | Automatic dual-token rotation renewing access credentials. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes current session token and clears client state. |
| `GET` | `/api/v1/users/me` | Authenticated | Fetches authenticated user profile, assigned role, partner organization ID (`partnerId`), and permission list. |

### 1.2 Theatre Entity Management
Mounted at `/api/v1/owner/theatres`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/` | `THEATRE_CREATE` | Registers a new master theatre entity under the authenticated owner's partner identity. |
| `GET` | `/` | `THEATRE_READ` | Lists all theatres owned by the authenticated partner with pagination and filtering. |
| `GET` | `/:theatreId` | `THEATRE_READ` | Retrieves complete details for a specific theatre with tenancy verification. |
| `PATCH` | `/:theatreId` | `THEATRE_UPDATE` | Updates core theatre metadata (name, contact details, address). |
| `PATCH` | `/:theatreId/operations` | `THEATRE_UPDATE` | Updates operating policies (cancellation windows, facilities, operating hours). |
| `PATCH` | `/:theatreId/media` | `THEATRE_UPDATE` | Updates logo and promotional imagery URLs. |
| `DELETE` | `/:theatreId` | `THEATRE_DELETE` | Soft-deletes a theatre entity after validating no active shows exist. |

### 1.3 Branch Management
Mounted at `/api/v1/owner`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/theatres/:theatreId/branches` | `THEATRE_UPDATE` | Adds a physical branch/multiplex location under a master theatre brand. |
| `GET` | `/theatres/:theatreId/branches` | `THEATRE_READ` | Retrieves all active branches belonging to a specific theatre. |
| `GET` | `/branches/:branchId` | `THEATRE_READ` | Fetches single branch details. |
| `PATCH` | `/branches/:branchId` | `THEATRE_UPDATE` | Updates branch contact, address, coordinates, and facilities. |
| `PATCH` | `/branches/:branchId/status` | `THEATRE_UPDATE` | Toggles operational status (`ACTIVE`, `INACTIVE`, `MAINTENANCE`). |
| `DELETE` | `/branches/:branchId` | `THEATRE_UPDATE` | Soft-deletes a branch. |

### 1.4 Screen & Seat Layout Management
Mounted at `/api/v1/owner`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/theatres/:theatreId/screens` | `SCREEN_MANAGE` | Creates a new auditorium screen under a theatre/branch. |
| `GET` | `/theatres/:theatreId/screens` | `THEATRE_READ` | Lists screens for a theatre with filtering (status, projection type, sound). |
| `GET` | `/screens/:screenId` | `THEATRE_READ` | Fetches auditorium screen details and active layout version. |
| `PATCH` | `/screens/:screenId` | `SCREEN_MANAGE` | Updates screen specifications (supported audio/video formats). |
| `PATCH` | `/screens/:screenId/status` | `SCREEN_MANAGE` | Toggles screen status (`ACTIVE`, `MAINTENANCE`, `INACTIVE`). |
| `DELETE` | `/screens/:screenId` | `SCREEN_MANAGE` | Deletes screen if no scheduled future shows exist. |
| `GET` | `/seat-categories` | `THEATRE_READ` | Lists seat categories defined for the partner (e.g. VIP, Platinum, Gold, Silver). |
| `POST` | `/seat-categories` | `SCREEN_MANAGE` | Creates a new custom seat tier. |
| `GET` | `/screens/:screenId/layout` | `THEATRE_READ` | Retrieves currently active/draft seating layout grid matrix. |
| `POST` | `/screens/:screenId/layout` | `SCREEN_MANAGE` | Saves seating layout draft matrix with rows, columns, aisles, and categories. |
| `POST` | `/screens/:screenId/layout/validate`| `SCREEN_MANAGE` | Validates layout structure, continuous seat numbering, and aisle boundaries. |
| `POST` | `/screens/:screenId/layout/generate`| `SCREEN_MANAGE` | Procedural seat generator generating rows, seats, and aisles programmatically. |
| `GET` | `/screens/:screenId/layout/preview` | `THEATRE_READ` | Read-only geometric rendering of layout draft. |
| `POST` | `/screens/:screenId/layout/publish` | `SCREEN_MANAGE` | Immutably commits draft into published version. Future edits spawn new draft. |
| `GET` | `/screens/:screenId/layout/versions`| `THEATRE_READ` | Version history of all published layouts for the screen. |

### 1.5 Shows & Dynamic Show Pricing
Mounted at `/api/v1/owner/shows`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `POST` | `/` | `SHOW_CREATE` | Schedules a new show connecting Movie, Theatre, Screen, and published Layout. Enforces schedule conflict detection. |
| `GET` | `/` | `SHOW_READ` | Lists shows belonging to partner's theatres with date range, status, and movie filters. |
| `GET` | `/:showId` | `SHOW_READ` | Retrieves show specifications, playback formats, and category price mappings. |
| `PATCH` | `/:showId` | `SHOW_UPDATE` | Updates non-timing show attributes (audio language, subtitle configuration). |
| `PATCH` | `/:showId/reschedule` | `SHOW_UPDATE` | Reschedules show time window with conflict validation. |
| `POST` | `/:showId/publish` | `SHOW_UPDATE` | Publishes draft show to public booking engine. Requires active pricing. |
| `POST` | `/:showId/cancel` | `SHOW_UPDATE` | Cancels scheduled show, triggering automatic refund pipeline for booked customers. |
| `PUT` | `/:showId/pricing` | `SHOW_UPDATE` | Sets price per seat category for this specific show instance. |
| `GET` | `/:showId/pricing` | `SHOW_READ` | Gets price table for seat categories in the show. |
| `PATCH` | `/:showId/pricing/:categoryCode` | `SHOW_UPDATE` | Adjusts individual category price tier. |

### 1.6 Tenant-Isolated Bookings & Admissions
Mounted at `/api/v1/owner/bookings` and `/api/v1/bookings`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/owner/bookings` | `BOOKING_READ` | Lists bookings strictly isolated to the partner's theatres. Filter by date, status, theatre, screen. |
| `GET` | `/api/v1/bookings/:bookingId` | `BOOKING_READ` | Returns detailed booking invoice, customer info, allocated seats, and QR code for scanning. |

### 1.7 Financials, Analytics & Revenue Settlements
Mounted at `/api/v1/owner/analytics` & `/api/v1/theatre-owner/analytics`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/overview` | `REPORT_READ` | Summarizes active shows, tickets sold, gross sales, platform fee deductions, refunds, and net payable. |
| `GET` | `/bookings` | `REPORT_READ` | Daily trend series and booking status breakdown (`CONFIRMED`, `CANCELLED`, `EXPIRED`). |
| `GET` | `/revenue` | `REPORT_READ` | Settlement breakdown per date range with CSV downloadable exports. |

### 1.8 Staff Management & Access Delegation
Mounted at `/api/v1/owner/theatres/:theatreId/staff`:
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/` | `STAFF_MANAGE` | Lists staff members assigned to the theatre. |
| `POST` | `/` | `STAFF_MANAGE` | Invites/assigns an existing user or creates staff member with role (`THEATRE_MANAGER` or `THEATRE_STAFF`). |
| `DELETE` | `/:userId` | `STAFF_MANAGE` | Revokes staff access from the theatre. |

---

## 2. Real-Time WebSocket Infrastructure
The dashboard connects to Socket.IO at root URL `http://localhost:5000`:
- **Partner Channel**: Authenticates socket via JWT handshake and joins room `partner:<partnerId>`.
- **Show Inventory Rooms**: Joins `show:<showId>` to observe live seat locks, releases, and confirmations in real time for front-desk monitoring.
- **Alert Channel**: Receives real-time notifications for approval updates, show cancellations, and large group bookings.

---

## 3. Strict Multi-Tenant Isolation Audit
- **Tenant Scope Enforcer**: Every query and mutation checks `req.user.partnerId` against the underlying resource (`theatre.partnerId`, `screen.theatreId.partnerId`, `show.theatreId.partnerId`, `booking.partnerId`).
- **Cross-Tenant Guard**: Any attempt to read or mutate another partner's resource results in an immediate `404 Not Found` or `403 Forbidden` response to prevent IDOR enumeration.
- **Role Permissions Boundary**: `THEATRE_STAFF` accounts are prevented from accessing financial analytics or modifying screen layouts.

---

## 4. UI/UX Architecture Strategy
The React frontend application in `apps/theatre-dashboard/` will be built with:
- **State Management**: TanStack Query v5 with optimistic updates and caching.
- **Styling**: Tailwind CSS dark-theme dashboard design system with sidebar, stats cards, clean data tables, interactive modal dialogs, and toast notifications.
- **Seat Layout Builder**: Interactive 2D matrix canvas grid with click-and-drag seat painting, category assignment, aisle toggles, and instant validation feedback.
- **Interactive Calendar**: Show timeline grid visualizer with conflict highlights.
- **Data Visualizations**: Recharts integration for revenue graphs, booking velocity, and seat occupancy pie charts.

