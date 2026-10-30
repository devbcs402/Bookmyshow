# Seating Layout Validation Rules

## 1. Overview
The **Layout Validation Engine** executes a strict, deterministic rule set before any draft can be saved or published. These rules enforce physical invariants, prevent corrupt UI rendering on mobile/web viewports, and eliminate inventory discrepancies.

---

## 2. Invariant Rules Matrix

| Rule Code | Invariant | Description | Error Message |
|---|---|---|---|
| `RULE_EMPTY_LAYOUT` | Non-Empty Seats | Layout must contain at least 1 physical seat | "Layout must contain at least one seat." |
| `RULE_UNIQUE_LABEL` | Label Collision | No two seats may have identical `seatLabel` | "Duplicate seat label detected: '<LABEL>'." |
| `RULE_COORDINATE_COLLISION` | Spatial Collision | No two seats may share identical `(gridRow, gridCol)` | "Overlapping coordinate detected at row X, col Y for seat '<LABEL>'." |
| `RULE_VALID_CATEGORY` | Category Integrity | Every seat's `categoryCode` must exist in active tenant or system categories | "Seat '<LABEL>' references unknown or inactive category code: '<CODE>'." |
| `RULE_ROW_LABEL` | Row Identifier | Every seat must define a non-empty `rowLabel` (e.g., 'A', 'B') | "Seat at index X is missing a valid row label." |
| `RULE_COL_NUMBER` | Column Number | `columnNumber` must be an integer $\ge 1$ | "Seat at index X column number must be a positive integer." |
| `RULE_ENUM_STATUS` | State Validity | `status` must be valid `ACTIVE`, `INACTIVE`, `BLOCKED`, `MAINTENANCE` | "Seat '<LABEL>' has invalid seat status: '<STATUS>'." |
| `RULE_ENUM_TYPE` | Type Validity | `type` must be valid `NORMAL`, `RECLINER`, `SOFA`, `WHEELCHAIR`, etc. | "Seat '<LABEL>' has invalid seat type: '<TYPE>'." |

---

## 3. Validation Workflow

```mermaid
flowchart TD
    Req[Incoming Layout Payload] --> C1{Seats is Array & Length > 0?}
    C1 -- No --> E1[Error: Empty Layout]
    C1 -- Yes --> Loop[Iterate Seat Items]
    Loop --> C2{seatLabel Unique?}
    C2 -- No --> E2[Error: Duplicate Label]
    C2 -- Yes --> C3{Coordinate (gridRow, gridCol) Unique?}
    C3 -- No --> E3[Error: Coordinate Overlap]
    C3 -- Yes --> C4{Category Code Active & Exists?}
    C4 -- No --> E4[Error: Unknown Category]
    C4 -- Yes --> C5{Coordinates >= 0?}
    C5 -- No --> E5[Error: Negative Coordinate]
    C5 -- Yes --> More{More Seats?}
    More -- Yes --> Loop
    More -- No --> CheckErrors{Any Errors Collected?}
    CheckErrors -- Yes --> ReturnFail[Return isValid: false, errors: [...]]
    CheckErrors -- No --> ReturnPass[Return isValid: true, errors: []]
```

---

## 4. Pre-Publication Validation
When `POST /screens/:screenId/layout/publish` is called, the validation engine runs with the full active tenant category lookup. If any validation rule fails, publication is rejected with HTTP `400 Bad Request` (`ErrorCodes.INVALID_LAYOUT`), preventing flawed auditoriums from ever generating bookable tickets.

