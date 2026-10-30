# Bulk Seat Generation Engine

## 1. Overview
Manually defining hundreds of individual seats in a visual editor is tedious and error-prone. The **Bulk Seat Generation Engine** automates auditorium construction through declarative row templates while fully accommodating real-world irregular layouts, aisle paths, omitted seats, and accessibility provisions.

---

## 2. Declarative Generation Schema

```json
{
  "rows": [
    {
      "rowLabel": "A",
      "seatCount": 16,
      "categoryCode": "RECLINER",
      "seatType": "RECLINER",
      "aislesAfter": [4, 12],
      "skipColumns": []
    },
    {
      "rowLabel": "B",
      "seatCount": 20,
      "categoryCode": "PREMIUM",
      "seatType": "NORMAL",
      "aislesAfter": [5, 15],
      "skipColumns": [1, 20]
    },
    {
      "rowLabel": "W",
      "seatCount": 4,
      "categoryCode": "WHEELCHAIR",
      "seatType": "WHEELCHAIR",
      "aislesAfter": [2],
      "skipColumns": []
    }
  ]
}
```

---

## 3. Algorithmic Coordinate Calculation

The generator processes each row specification:
1. **Row Stride**: Row index determines `gridRow` ($Y$-axis).
2. **Column Stride & Walking Aisles**:
   - Iterates $c = 1 \dots \text{seatCount}$.
   - If $c$ is listed in `skipColumns` (e.g. pillar or structural void), advances `currentGridCol` by 1 without creating a seat document.
   - Creates seat with label `${rowLabel}${columnNumber}` at `(gridRow, currentGridCol)`.
   - If $c$ is listed in `aislesAfter`, advances `currentGridCol` by 1 additional unit, leaving an empty walking corridor on the canvas.
3. **Accessibility Flagging**:
   - If `seatType === 'WHEELCHAIR'`, automatically sets `accessibility.isWheelchairAccessible = true`.
   - If `seatType === 'COMPANION'`, automatically sets `accessibility.hasCompanionSeat = true`.

---

## 4. Visual Example Output

For a row with `seatCount: 6`, `aislesAfter: [3]`, `skipColumns: [5]`:

| Column | Generated Seat | Grid Row | Grid Col | Note |
|---|---|---|---|---|
| 1 | `A1` | 0 | 0 | Seat |
| 2 | `A2` | 0 | 1 | Seat |
| 3 | `A3` | 0 | 2 | Seat before Aisle |
| - | *(Walking Aisle)* | 0 | 3 | Empty grid space |
| 4 | `A4` | 0 | 4 | Seat after Aisle |
| 5 | *(Pillar / Skipped)* | 0 | 5 | Empty grid space |
| 6 | `A5` | 0 | 6 | Seat |

Total Generated: 5 seats with exact spacing matching physical architectural blueprints.

