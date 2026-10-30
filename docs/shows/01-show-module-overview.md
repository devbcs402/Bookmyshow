# Show Management & Scheduling Module Overview

## 1. Executive Summary
The **Show Management & Scheduling Module** (Part 8) represents the operational junction of the BookMyShow Clone platform. It dynamically binds five independent architectural domains:
1. **Catalog Domain**: Approved titles, runtimes, formats, and spoken languages from the Movie module.
2. **Facility Domain**: Multi-tenant cinema multiplexes and branches from the Theatre module.
3. **Spatial Domain**: Auditoriums, sound systems, and projection hardware from the Screen module.
4. **Inventory Domain**: Immutable published seating layout versions and category breakdowns from the Seating Layout module.
5. **Commercial Domain**: Show-specific category pricing tiers, convenience fees, and tax calculations.

---

## 2. High-Level Architecture & Domain Relationships

```mermaid
flowchart TD
    M[Movie Catalog] -->|1. Title & Runtime| S[Show Entity]
    T[Approved Theatre] -->|2. Facility & Timezone| S
    SC[Active Screen] -->|3. Auditorium Hardware| S
    SL[Published Seating Layout] -->|4. Immutable Matrix & Categories| S
    TP[Theatre Partner Owner] -->|5. Schedule & Pricing Config| S

    subgraph Show Lifecycle Engine
        S -->|Draft Mode| Draft[Show: DRAFT]
        Draft -->|Configure Pricing| Pricing[Show Pricing Tiers]
        Pricing -->|Interval Validation| Conflict[Conflict Engine]
        Conflict -->|Passed & Published| Pub[Show: PUBLISHED]
    end

    Pub -->|Public Discovery| CustApp[Customer Web & Mobile Discovery]
    Pub -.->|Inventory Stamping| ShowsInv[Show Seat Inventory - Part 9]
```

---

## 3. Core Capabilities
- **Strict Tenant Isolation**: All show operations are strictly scoped to the authenticated theatre partner (`partnerId`), guaranteeing zero BOLA/IDOR vulnerabilities across competing cinema chains.
- **Interval Collision Engine**: Mathematical temporal overlap detection enforcing cleaning/turnaround buffers on a per-screen basis.
- **Race Condition Protection**: Distributed screen-level lock coordination (Redis-backed with distributed fallback) + MongoDB ACID transactions to prevent simultaneous double-booking of auditoriums.
- **Immutable Layout Binding**: Shows are bound to specific `layoutVersion` numbers, ensuring future auditorium renovations do not alter historical show inventories.
- **Dynamic Category Pricing**: Show-specific pricing matrix mapped directly to the actual categories present in the auditorium's layout.
- **Comprehensive Public APIs**: High-performance public listing endpoints filtered strictly by `status: PUBLISHED`.

