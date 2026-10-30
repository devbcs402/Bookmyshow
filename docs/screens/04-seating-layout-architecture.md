# Seating Layout Architecture

## 1. Overview
The **Seating Layout Engine** translates physical cinema seating configurations into mathematical 2D matrix representations. Real-world cinema halls are not simple rectangular grids; they feature curved seating arcs, variable row lengths, emergency exits, walking aisles, staggered seats, wheelchair companion pairs, and projection booth dead zones.

---

## 2. Spatial Grid Coordinate Model

Each seat occupies a coordinate pair `(gridRow, gridCol)` on an SVG/HTML5 canvas:
- `gridRow` ($Y$-axis): 0-indexed row position from top to bottom (Row 0 is nearest to the screen, or back depending on display orientation).
- `gridCol` ($X$-axis): 0-indexed column position from left to right.

```
Visual Grid Representation (e.g. Row A with Aisle after Col 2):
+--------+--------+--------+--------+--------+--------+
| Grid 0 | Grid 1 | Grid 2 | Grid 3 | Grid 4 | Grid 5 |
|   A1   |   A2   |  GAP   |   A3   |   A4   |   A5   |
+--------+--------+--------+--------+--------+--------+
```

### Irregular Layout Support
- **Walking Aisles**: Represented by skipping column indices without generating a seat document (e.g. Seat at `gridCol: 2`, Aisle gap at `gridCol: 3`, next Seat at `gridCol: 4`).
- **Pillars & Obstructions**: Skipped column indices (`skipColumns: [X]`) leaving natural gaps in the canvas.
- **Variable Row Lengths**: Front VIP rows may have 8 chairs, middle rows 18 chairs, and rear rows 22 chairs.

---

## 3. Data Representation

### 3.1 SeatingLayout Document
Stores complete serialized blueprints used by the frontend layout builder:
```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0f2",
  "screenId": "65f1a2b3c4d5e6f7a8b9c0e1",
  "layoutVersion": 1,
  "status": "PUBLISHED",
  "totalSeats": 120,
  "bookableSeats": 118,
  "totalRows": 8,
  "totalColumns": 16,
  "categoryBreakdown": [
    { "categoryCode": "PREMIUM", "count": 40, "bookableCount": 40 },
    { "categoryCode": "REGULAR", "count": 80, "bookableCount": 78 }
  ],
  "seats": [
    {
      "rowLabel": "A",
      "columnNumber": 1,
      "seatLabel": "A1",
      "categoryCode": "REGULAR",
      "type": "NORMAL",
      "status": "ACTIVE",
      "gridRow": 0,
      "gridCol": 0,
      "isAvailable": true,
      "accessibility": {
        "isWheelchairAccessible": false,
        "hasCompanionSeat": false
      }
    }
  ]
}
```

### 3.2 Physical Seat Collection
During publication, each element in the `seats` array is converted into an independent, indexed document in the `seats` collection to support efficient atomic locking, indexing, and show-time inventory instantiation in Part 8.

