# 27 – Three-Application Integration Review

## 1. Multi-Application Ecosystem Overview
The BookMyShow-like platform encompasses three distinct frontend applications interacting with the unified backend API:

```mermaid
flowchart TD
    subgraph Apps["Frontend Applications (React 18 SPAs)"]
        CustomerApp["Customer Frontend (apps/customer-frontend)\n• Discovery, Seat Locks, Razorpay Checkout, Tickets"]
        TheatreApp["Theatre Partner Dashboard (apps/theatre-dashboard)\n• Multi-Tenant Multiplex, 2D Layout Builder, Show Scheduling, Staff"]
        AdminApp["Super Admin Dashboard (apps/admin-dashboard)\n• Governance, Approvals, Financials, Audit Logs, System Health"]
    end

    subgraph BackendGateway["Unified Backend Engine (Express.js /api/v1)"]
        PublicGateway["Public Customer APIs (/movies, /theatres, /shows, /bookings)"]
        OwnerGateway["Owner APIs (/owner/* - Isolated by partnerId)"]
        AdminGateway["Admin APIs (/admin/* - Strictly SUPER_ADMIN)"]
    end

    subgraph Infrastructure["Storage & Real-Time Tier"]
        Mongo[(MongoDB Distributed Cluster)]
        RedisCache[(Redis Cache & Atomic Lua Seat Locks)]
        SocketIO["Socket.IO Server Engine"]
    end

    CustomerApp --> PublicGateway
    TheatreApp --> OwnerGateway
    AdminApp --> AdminGateway

    CustomerApp <-->|WebSockets| SocketIO
    TheatreApp <-->|WebSockets| SocketIO
    AdminApp <-->|WebSockets| SocketIO

    PublicGateway --> Mongo
    PublicGateway --> RedisCache
    OwnerGateway --> Mongo
    AdminGateway --> Mongo
```

---

## 2. Cross-Application Contract Consistency Verification

| Verification Criterion | Customer Frontend | Theatre Partner Dashboard | Super Admin Dashboard | Consistency Status |
|---|---|---|---|:---:|
| **Authentication Flow** | Dual-token JWT (`/auth/login`) | Dual-token JWT (`/auth/login`) | Dual-token JWT (`/auth/login`) | **100% Consistent** |
| **RBAC Enforcement** | `CUSTOMER` role check | `THEATRE_OWNER`, `MANAGER`, `STAFF` | Strict `SUPER_ADMIN` check | **100% Enforced** |
| **Movie Lifecycle** | Shows `RELEASED` & approved | Schedules `APPROVED` titles | Approves / Rejects titles | **100% Aligned** |
| **Theatre Onboarding** | Only displays `APPROVED` theatres | Registers & edits properties | Approves / Rejects / Suspends | **100% Aligned** |
| **Seat Inventory** | Atomic locks & real-time socket sync | 2D Layout Builder & live occupancy | Screen & layout oversight | **100% Aligned** |
| **Booking & Payments** | Razorpay modal payment & HMAC verify | Tenant-isolated booking explorer | Platform-wide explorer & refunds | **100% Aligned** |
| **Settlement Metrics** | Customer ticket total | Net payable (Gross - Fee - Refunds) | Platform commission (10%) & ledger | **100% Aligned** |

