# 16 – Commission Management

## 1. Commission Structure
Platform commission is calculated by the approved accounting engine (`/api/v1/admin/analytics/revenue`):
- Standard platform commission rate: 10% of Gross Ticket Sales.
- Gross Revenue = Captured customer ticket payments.
- Platform Revenue = Gross Ticket Sales $\times$ Commission Rate (10%).
- Net Payable to Exhibitor = Gross Ticket Sales $-$ Platform Commission $-$ Customer Refunds.

