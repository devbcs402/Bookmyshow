# Razorpay Gateway Checkout & Signature Verification
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/11-payment-integration.md`**

---

## 1. Razorpay Integration Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant React as PaymentPage
    participant API as Payments API
    participant RZP as Razorpay Gateway

    Customer->>React: Clicks "Pay with Razorpay"
    React->>API: POST /api/v1/payments/create-order { bookingId }
    API->>RZP: Create Order (amountInPaise, currency, receipt)
    RZP-->>API: rzpOrder (id: order_xxx, amount)
    API-->>React: Checkout details (keyId, orderId, amount, currency)
    
    React->>Customer: Opens standard Razorpay Checkout modal
    Customer->>RZP: Enters payment credentials & completes 3D-Secure
    RZP-->>React: handler response { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    
    React->>API: POST /api/v1/payments/verify (signature payload)
    API->>API: Verify HMAC SHA-256 signature against Razorpay secret
    API->>API: Confirm Booking & Mark Seats Permanently Booked
    API-->>React: 200 OK (Booking CONFIRMED)
    React->>Customer: Navigates to /booking/:bookingId/confirmation
```

---

## 2. Zero-Trust Security Invariants

1. **No Gateway Secrets in Bundle**: The client never stores or knows the `RAZORPAY_KEY_SECRET`. Only the public `keyId` returned from the backend order endpoint is used to mount the checkout script.
2. **Never Trust Client Confirmation**: The frontend never marks a booking confirmed on its own. Confirmation requires cryptographic HMAC SHA-256 verification by the backend or an authoritative webhook callback.
3. **Handling Modal Dismissal**: If the patron closes the checkout modal (`modal.ondismiss`), the booking remains in `PENDING_PAYMENT` until the seat lock TTL expires, allowing the patron to retry payment.

