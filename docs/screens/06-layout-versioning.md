# Immutable Layout Versioning Architecture

## 1. Problem Statement: The Auditorium Renovation Dilemma
In high-volume movie ticketing systems, cinemas frequently alter auditoriums:
- Recliner installations (reducing 250 standard chairs to 120 VIP recliners).
- Temporary physical seat blocking for VIP events, sound consoles, or technical maintenance.
- Emergency aisle modifications.

**Naive Anti-Pattern**: Mutating existing seat records in-place.
- **Catastrophic Impact**: If an auditorium's layout is mutated in-place, historical bookings for past shows now reference deleted or repositioned seats. Customer tickets for "Seat C12" point to empty aisles, financial audit reports fail, and refund calculations become corrupt.

---

## 2. Immutable Versioning Solution

Our architecture treats each published seating layout as an **immutable snapshot**:

```mermaid
sequenceDiagram
    autonumber
    participant Owner as Theatre Owner
    participant Svc as SeatingLayoutService
    participant LayoutRepo as SeatingLayout Collection
    participant SeatRepo as Seats Collection
    participant ScreenRepo as Screens Collection

    Owner->>Svc: Publish Layout (Screen S1)
    Svc->>LayoutRepo: Find Current Published Layout
    Note over Svc,LayoutRepo: Current = Version 1 (150 Seats)
    Svc->>Svc: Determine Next Version = 2
    Svc->>SeatRepo: Bulk Insert Seats (layoutVersion: 2)
    Svc->>LayoutRepo: Mark Version 1 as DEPRECATED
    Svc->>LayoutRepo: Mark Version 2 as PUBLISHED
    Svc->>ScreenRepo: Update Screen (layoutVersion: 2, totalSeats: 120)
    Svc-->>Owner: 200 OK (Published Version 2)

    Note over SeatRepo: Historical Show X still links to layoutVersion 1!<br/>Future Show Y links to layoutVersion 2!
```

---

## 3. Version Lifecycle States

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Owner edits/generates grid
    DRAFT --> DRAFT: Incremental auto-saves & validation
    DRAFT --> PUBLISHED: Owner triggers Publish (version stamped)
    PUBLISHED --> DEPRECATED: New layout published for this screen
    DEPRECATED --> DEPRECATED: Read-only for historical show audits
```

1. **`DRAFT`**: Working buffer. Can be freely edited, regenerated, tested, and previewed without affecting active shows or tickets.
2. **`PUBLISHED`**: Active blueprint for all newly scheduled shows. Exactly one layout per screen has `status: 'PUBLISHED'` at any time.
3. **`DEPRECATED`**: Historical blueprint. Retained indefinitely for past show lookups, customer booking history, and accounting reconciliations.

---

## 4. Database-Level Isolation
In the `seats` collection, physical chairs carry `layoutVersion`:
```javascript
{
  screenId: ObjectId("65f1a2b3c4d5e6f7a8b9c0e1"),
  layoutVersion: 2, // Explicit version scope
  seatLabel: "A1",
  gridRow: 0,
  gridCol: 0
}
```
Compound unique indexes include `layoutVersion`:
- `{ screenId: 1, layoutVersion: 1, seatLabel: 1 }` (Unique)
- `{ screenId: 1, layoutVersion: 1, gridRow: 1, gridCol: 1 }` (Unique)

This allows Version 2 to have completely different row counts, labels, and coordinates without colliding with Version 1.

