# Part 11 — Payment Failure Handling & Error Diagnostics

## 1. Overview

Payment failures can occur across various stages of checkout: card declines, incorrect OTP entries, bank gateway outages, network timeouts, or client modal dismissals.

The platform distinguishes between:
1. **User-Recoverable Failures**: The payment attempt failed, but the booking countdown timer is still active. The user can retry with another payment method.
2. **Terminal Failures**: Booking window has expired, or the gateway returned a non-retryable rejection.
3. **Gateway Discrepancies**: Funds deducted from customer account after booking expired.

---

## 2. Failure Handling Architecture

```mermaid
flowchart TD
    FailureEvent["Payment Failure Occurs"]
    
    FailureEvent --> BranchCheck{"Failure Source?"}
    
    BranchCheck -->|Webhook: payment.failed| LogGatewayFailure["Log Gateway Error Code & Reason in Payment Record"]
    LogGatewayFailure --> UpdatePaymentFailed["Transition Payment to FAILED"]
    UpdatePaymentFailed --> CheckBookingWindow{"Is Booking Window Active?"}
    
    CheckBookingWindow -->|Yes (expiresAt > now)| AllowRetry["Keep Booking PENDING_PAYMENT; Client may retry new payment order"]
    CheckBookingWindow -->|No (expiresAt <= now)| ExpireBooking["Sweeper marks booking EXPIRED; Seats returned to pool"]

    BranchCheck -->|Client Modal Dismissed| ModalDismissed["Client drops checkout; Payment remains CREATED or PENDING"]
    ModalDismissed --> AutoExpire["PaymentReconciliationService flags stale CREATED order as FAILED after 15m"]

    BranchCheck -->|Late Payment on Expired Booking| LatePayment["Capture received for EXPIRED booking"]
    LatePayment --> AutoRefund["Mark Payment CAPTURED + REFUND_REQUIRED; Trigger automatic refund queue"]
```

---

## 3. Error Classification & Structured Error Codes

The system defines specific financial error codes in `src/common/constants/error-codes.js`:

| Error Code | HTTP Status | Description | Actionable Resolution |
| :--- | :--- | :--- | :--- |
| `INVALID_PAYMENT_SIGNATURE` | 400 | HMAC-SHA256 signature verification failed. Possible fraud or payload tampering. | Re-authenticate, reject confirmation, and log security warning. |
| `PAYMENT_ALREADY_CAPTURED` | 409 | Attempting to capture or verify a payment that has already been captured. | Return idempotent success if matching booking is confirmed. |
| `PAYMENT_FAILED` | 400 | Gateway transaction declined by card network or issuing bank. | Prompt user to choose alternate payment instrument. |
| `BOOKING_ALREADY_EXPIRED` | 409 | Customer attempted checkout after the 5-minute countdown window elapsed. | Advise customer that seats were released; issue auto-refund if captured. |
| `REFUND_EXCEEDS_CAPTURED_AMOUNT` | 400 | Requested refund amount exceeds the unrefunded balance. | Reject request with balance limits. |
| `PAYMENT_GATEWAY_ERROR` | 502 | Upstream Razorpay network outage or internal error. | Retry with exponential backoff or prompt customer to retry later. |

---

## 4. Late Payment vs Expiration Guard

In rare cases, a customer authorizes an SMS OTP right as their 5-minute timer hits zero. The background sweeper marks the booking `EXPIRED` and unlocks the seats, but Razorpay charges the customer's bank account.

When the verification request (`POST /verify`) or webhook (`payment.captured`) arrives for an expired booking:
1. The system **never ignores the capture** or silently discards the transaction.
2. The `Payment` document is marked `CAPTURED` to accurately reflect bank deductions.
3. The field `reconciliationStatus` is set to `'REFUND_REQUIRED'`.
4. A 409 Conflict error is returned informing the user:
   > *"Payment succeeded at gateway, but the booking window expired. Your payment has been safely recorded and queued for automatic refund."*
5. The transaction is immediately queued for refund settlement without human intervention.

