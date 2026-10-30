# Part 10 — Server-Side Pricing Engine & Tax Calculation

## 1. Executive Summary

A critical security flaw in amateur ticket booking systems is accepting ticket prices, convenience fees, or discounts from the frontend client. In Part 10, the booking engine strictly prohibits client-submitted pricing.

The **BookingPricingService** executes authoritative server-side price evaluation, computing seat base prices, category breakdowns, platform convenience fees, statutory taxes (GST), and promotional discounts with half-up rounding precision.

---

## 2. Pricing Mathematics & Breakdown Structure

For a booking consisting of $N$ seats across categories $\{c_1, c_2, \dots, c_N\}$:

$$\text{Seat Base Price} = P_{\text{base}}(c_i)$$

$$\text{Seat Convenience Fee} = F_{\text{fee}}(c_i) \quad (\text{default: } ₹30.00)$$

$$\text{Seat Tax Amount} = \text{round}\left( F_{\text{fee}}(c_i) \times \frac{T_{\text{percent}}}{100} \right) \quad (T_{\text{percent}} = 18.0\% \text{ GST})$$

$$\text{Seat Final Price} = \text{round}\left( P_{\text{base}}(c_i) + F_{\text{fee}}(c_i) + \text{Seat Tax Amount} \right)$$

$$\text{Net Payable Amount} = \max\left( 0, \sum_{i=1}^N \text{Seat Final Price}_i - \text{Discount} \right)$$

---

## 3. Financial Precision & Rounding Rules

To eliminate IEEE-754 floating-point inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`), `BookingPricingService` employs an epsilon-adjusted rounding algorithm:

```javascript
static round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
```

Every monetary calculation is rounded to exactly two decimal places, matching Indian Rupee (INR) currency specifications.

---

## 4. Multi-Category Line Item Breakdown Example

Suppose a user books 2 seats:
1. **Seat A1**: `RECLINER` tier (Base: ₹500.00, Fee: ₹30.00, GST 18%: ₹5.40 -> ₹535.40)
2. **Seat B1**: `PREMIUM` tier (Base: ₹300.00, Fee: ₹30.00, GST 18%: ₹5.40 -> ₹335.40)

### Calculated Breakdown:
- **Total Base Amount**: ₹800.00
- **Total Convenience Fee**: ₹60.00
- **Total Tax (18% GST)**: ₹10.80
- **Discount Amount**: ₹0.00
- **Net Payable Amount**: ₹870.80

### Persisted Seat Subdocuments:
```json
[
  {
    "seatId": "65f1a2b3c4d5e6f7a8b9c0a1",
    "seatLabel": "A1",
    "categoryCode": "RECLINER",
    "basePrice": 500.0,
    "convenienceFee": 30.0,
    "taxAmount": 5.4,
    "finalPrice": 535.4,
    "status": "RESERVED"
  },
  {
    "seatId": "65f1a2b3c4d5e6f7a8b9c0b1",
    "seatLabel": "B1",
    "categoryCode": "PREMIUM",
    "basePrice": 300.0,
    "convenienceFee": 30.0,
    "taxAmount": 5.4,
    "finalPrice": 335.4,
    "status": "RESERVED"
  }
]
```

---

## 5. Security & Tamper-Proof Guarantees

1. **Frontend Isolation**: The frontend submits only `showId` and `seatIds[]`. Any price parameters included in the request body are stripped by Zod validation.
2. **Dynamic Tier Match**: Each seat's `categoryCode` is resolved against the show's published `pricingTiers` array in MongoDB. If a tier is missing or mismatched, creation fails with `HTTP 400 Bad Request` (`PRICE_CALCULATION_ERROR`).
3. **Discount Floor**: Discounts can never reduce the `netPayableAmount` below 0.

