# 12 – Dynamic Pricing Management

## 1. Show Pricing Hierarchy
Each show instance must have seat pricing configured before it can be published to the public booking engine.
Pricing is defined per seat category:
- `REGULAR` / `SILVER`: Standard seating tier.
- `GOLD`: Mid-tier premium seating.
- `PLATINUM`: Front-balcony or prime viewing tier.
- `VIP` / `RECLINER`: Motorized luxury recliners.

---

## 2. Dynamic Show Pricing API
- `PUT /api/v1/owner/shows/:showId/pricing`: Sets comprehensive category prices:
  ```json
  {
    "pricing": [
      { "categoryCode": "SILVER", "basePrice": 150 },
      { "categoryCode": "GOLD", "basePrice": 220 },
      { "categoryCode": "PLATINUM", "basePrice": 350 },
      { "categoryCode": "VIP", "basePrice": 500 }
    ]
  }
  ```
- `PATCH /api/v1/owner/shows/:showId/pricing/:categoryCode`: Quick adjust for individual tiers during peak demand or promotions.
- Validates that every active seat category present in the screen's layout has an assigned base price greater than zero.

