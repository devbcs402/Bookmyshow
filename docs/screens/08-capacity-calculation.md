# Capacity Calculation Engine

## 1. Overview
In commercial cinema operations, **Total Physical Chairs** does not equal **Bookable Ticket Capacity**. Auditoriums routinely contain broken seats under maintenance, seats reserved for cinema staff or sound mixers, or emergency buffer seats.

The **Capacity Calculation Engine** provides immediate, granular metric breakdowns computed directly from layout matrices.

---

## 2. Capacity Metrics Definitions

$$\text{Total Physical Seats} = \sum_{\text{all seats}} 1$$

$$\text{Bookable Capacity} = \sum (\text{status} == \text{ACTIVE} \land \text{isAvailable} == \text{true})$$

$$\text{Blocked Inventory} = \sum (\text{status} == \text{BLOCKED})$$

$$\text{Maintenance Inventory} = \sum (\text{status} == \text{MAINTENANCE})$$

$$\text{Inactive Inventory} = \sum (\text{status} == \text{INACTIVE})$$

---

## 3. Metric Breakdown Structure

When a layout is validated, saved, or previewed, the engine returns:

```json
{
  "totalSeats": 240,
  "bookableSeats": 234,
  "activeSeats": 236,
  "blockedSeats": 4,
  "maintenanceSeats": 2,
  "inactiveSeats": 0,
  "totalRows": 12,
  "totalColumns": 24,
  "categoryBreakdown": [
    {
      "categoryCode": "RECLINER",
      "count": 24,
      "bookableCount": 24
    },
    {
      "categoryCode": "PREMIUM",
      "count": 96,
      "bookableCount": 94
    },
    {
      "categoryCode": "REGULAR",
      "count": 120,
      "bookableCount": 116
    }
  ],
  "rowBreakdown": [
    { "rowLabel": "A", "totalSeats": 12, "bookableSeats": 12 },
    { "rowLabel": "B", "totalSeats": 12, "bookableSeats": 12 },
    { "rowLabel": "L", "totalSeats": 24, "bookableSeats": 22 }
  ]
}
```

---

## 4. Automatic Screen Synchronization
Upon layout publication via `POST /screens/:screenId/layout/publish`:
1. `screen.totalSeats` is synchronized with `capacity.totalSeats`.
2. `screen.totalRows` is synchronized with `capacity.totalRows`.
3. `screen.totalColumns` is synchronized with `capacity.totalColumns`.
4. `screen.layoutVersion` increments to the new version.

This keeps top-level screen listings and search indices instantaneously up to date without requiring expensive runtime aggregations.

