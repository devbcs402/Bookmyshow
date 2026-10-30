# 09 – Seat Layout Builder Engine

## 1. Engine Overview
The **Dynamic Seat Layout Builder** provides an interactive visual canvas that enables cinema managers to design, configure, validate, and publish custom auditorium seat layouts.

```mermaid
flowchart LR
    DesignCanvas["Visual Layout Editor (Rows, Columns, Aisles)"]
    BulkGenerator["Procedural Row/Seat Generator"]
    Validation["Validation Pipeline (Gaps, Numbering, Categories)"]
    DraftStore["Draft Layout (v0)"]
    PublishEngine["Publish Engine (Immutable v1, v2...)"]

    BulkGenerator --> DesignCanvas
    DesignCanvas --> DraftStore
    DraftStore --> Validation
    Validation -->|Valid| PublishEngine
    Validation -->|Errors| DesignCanvas
```

---

## 2. Key Builder Capabilities
1. **Interactive 2D Grid**:
   - Customizable rows (A-Z) and columns (1-30+).
   - Click to toggle individual seat types: `NORMAL`, `RECLINER`, `WHEELCHAIR`, `EMPTY_SPACE` (aisle/walkway).
2. **Category Assignment**:
   - Assign categories (VIP, Platinum, Gold, Silver) to rows or individual seat selections.
3. **Bulk Generation Tool**:
   - Quick generator for standard auditorium configurations: specifies number of rows, seats per row, aisle placements (e.g. aisle after seat 4 and seat 16), and category tier spans.
4. **Validation Engine**:
   - Ensures continuous seat numbering per row across aisles.
   - Verifies all active seats have valid categories mapped.
   - Detects orphaned seats or irregular row alignments.
5. **Draft & Immutable Publishing**:
   - In-progress designs are persisted via `POST /screens/:screenId/layout` as drafts.
   - When finalized, `POST /screens/:screenId/layout/publish` freezes the layout as a new immutable version (e.g., Version 1, 2).
   - Any future modifications create a new working draft without disrupting active shows booked on existing layout versions.

