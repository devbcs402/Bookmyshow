# 14 – Revenue and Settlements Audit

## 1. Financial Settlement Architecture
The platform provides theatre owners with complete transparency regarding ticket revenue, platform commissions, taxes, refund deductions, and net payouts.

```mermaid
flowchart LR
    Gross["Gross Ticket Sales (100%)"]
    PlatformCommission["Platform Commission (e.g. 5-10%)"]
    Refunds["Customer Refund Deductions"]
    NetSettlement["Net Payable to Partner"]

    Gross --> NetSettlement
    PlatformCommission -.->|Deducted| NetSettlement
    Refunds -.->|Deducted| NetSettlement
```

---

## 2. Settlement Analytics Endpoints
- `GET /api/v1/owner/analytics/overview`: High-level summary of active shows, tickets sold, gross sales, platform fees, refunds, and net payable.
- `GET /api/v1/owner/analytics/revenue`: Date-range breakdown of settled transactions.
- **CSV Export**: Generates and downloads financial reports for partner accounting and GST reconciliation.

