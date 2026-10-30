# 15 – Payment and Refund Management

## 1. Razorpay Payment Transactions
- `GET /api/v1/payments/:id`: Inspects gateway payment record, Razorpay Order ID, Payment ID, signature verification status, and method (`card`, `upi`, `netbanking`).
- Payment Lifecycle States: `CREATED`, `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUND_PENDING`, `REFUNDED`.

---

## 2. Gateway Refund Processing
- `POST /api/v1/payments/:id/refunds`: Super Admin can trigger partial or full refunds against eligible captured payments.
- Over-refund prevention: Validates that refund amount $\le$ remaining captured amount.
- Status is only updated to `REFUNDED` after webhook or direct gateway confirmation.

