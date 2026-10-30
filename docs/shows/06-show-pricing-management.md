# Show Pricing Management

## 1. Overview
The **Show Pricing Subsystem** connects physical auditorium layout tiers with commercial pricing. A single movie title may be screened with different ticket prices depending on the day of the week, screening time (matinee vs. prime evening), or special event premiere status.

---

## 2. Category-to-Layout Invariance Rule

A show's pricing tiers must strictly map to the seat categories defined in the screen's **published seating layout version**:

```
Screen 1 (Layout Version 1):
├── Category: REGULAR   --> Required Show Price: ₹150
├── Category: PREMIUM   --> Required Show Price: ₹250
└── Category: RECLINER  --> Required Show Price: ₹450
```

### Invariance Rules:
1. **No Phantom Tiers**: Pricing cannot be configured for category codes that do not exist in the screen's layout.
2. **Completeness Gate**: A show cannot transition from `DRAFT` to `PUBLISHED` if any active category in the screen's layout lacks a pricing configuration.
3. **Non-Negative Pricing**: Base prices and convenience fees must be $\ge 0$.

---

## 3. Effective Price Formula

The platform automatically computes and denormalizes the final effective ticket price:

$$\text{Subtotal} = \text{BasePrice} + \text{ConvenienceFee}$$

$$\text{TaxAmount} = \frac{\text{Subtotal} \times \text{TaxPercent}}{100}$$

$$\text{EffectivePrice} = \text{Round}(\text{Subtotal} + \text{TaxAmount}, 2)$$

### Example Calculation:
- Base Price: ₹400.00
- Convenience Fee: ₹25.00
- GST (18.0%): ₹76.50
- Effective Price: **₹501.50**

---

## 4. API Endpoints
- `PUT /api/v1/owner/shows/:showId/pricing`: Set or overwrite all pricing tiers for the show.
- `GET /api/v1/owner/shows/:showId/pricing`: View current pricing tiers.
- `PATCH /api/v1/owner/shows/:showId/pricing/:categoryCode`: Update base price or fees for a specific category.

