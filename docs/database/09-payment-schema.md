# 09. Payment Gateway, Refunds & Webhook Audit Schema Specification

## 1. Compliance & Security Standards: Zero PCI-DSS Footprint

The Payment subsystem processes real-time monetary transactions via **Razorpay**. In accordance with banking regulations and PCI-DSS Level 1 mandates:
1. **Zero Cardholder Data Storage**: Raw credit/debit card numbers, CVVs, expiration dates, and NetBanking passwords are never accepted, processed, logged, or stored on application servers.
2. **Hosted Tokenization**: The client browser interacts directly with Razorpay's PCI-DSS compliant checkout iframe, returning only opaque reference tokens (`razorpay_order_id`, `razorpay_payment_id`, and cryptographic HMAC signatures).
3. **Cryptographic Webhook Ingress**: Every webhook notification is verified against the shared secret using `crypto.timingSafeEqual` to eliminate timing attack vectors.

---

## 2. Collection Schemas

### 2.1 Collection: `payments`

#### A. Purpose
Primary financial ledger recording all incoming payment attempts, captures, and gateway states.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `bookingId` | `ObjectId` | Yes | - | Ref: `bookings` | Associated ticket order |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Paying customer |
| `partnerId` | `ObjectId` | Yes | - | Ref: `theatre_partners` | Settlement beneficiary tenant |
| `gateway` | `String` | Yes | `RAZORPAY` | Enum: `RAZORPAY`, `STRIPE` | Active payment processor |
| `razorpayOrderId` | `String` | Yes | - | Format: `order_` followed by alphanumeric | Unique order ID generated on Razorpay |
| `razorpayPaymentId`| `String`| No | `null` | Format: `pay_` followed by alphanumeric | Gateway transaction reference |
| `razorpaySignature`| `String`| No | `null` | 64-char hex string | HMAC-SHA256 client verification signature |
| `amount` | `Number` | Yes | - | Positive currency amount | Captured gross amount in Rupees |
| `amountInPaise` | `Number` | Yes | - | Integer (`amount * 100`) | Exact integer amount passed to gateway |
| `currency` | `String` | Yes | `INR` | 3-letter currency code | Transaction currency |
| `status` | `String` | Yes | `CREATED` | Enum: `CREATED`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED` | Gateway transaction state |
| `paymentMethod` | `String` | No | `""` | E.g. `UPI`, `CARD`, `NETBANKING`, `WALLET` | Payment rail used |
| `paymentDetails` | `SubDoc` | No | - | Bank / VPA / Card metadata | Safe non-sensitive metadata (VPA, bank name, card last 4) |
| `errorCode` | `String` | No | `""` | Gateway error identifier | Populated on decline |
| `errorDescription` | `String`| No | `""` | Human-readable failure reason | Populated on decline |
| `capturedAt` | `Date` | No | `null` | ISO Date | Timestamp when funds were captured |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### Sub-Document: `paymentDetails`
```typescript
{
  method: String,        // "upi" | "card" | "netbanking"
  vpa: String,           // "user@okaxis" (Masked UPI handle)
  cardNetwork: String,   // "VISA" | "MASTERCARD" | "RUPAY"
  cardLast4: String,     // "4321" (Strictly last 4 digits only)
  bankName: String       // "HDFC Bank"
}
```

#### C. Unique Constraints & Indexes
- **Unique**: `{ razorpayOrderId: 1 }`.
- **Sparse Unique**: `{ razorpayPaymentId: 1 }`.
- **Booking Payment Lookup Index**: `{ bookingId: 1, status: 1 }`.
- **Financial Audit Index**: `{ customerId: 1, createdAt: -1 }`.

---

### 2.2 Collection: `refunds`

#### A. Purpose
Tracks refund lifecycles resulting from eligible customer cancellations, system failures, or theatre screening cancellations.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `bookingId` | `ObjectId` | Yes | - | Ref: `bookings` | Cancelled booking |
| `paymentId` | `ObjectId` | Yes | - | Ref: `payments` | Original payment record |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Credited user |
| `razorpayRefundId`| `String` | No | `null` | Format: `rfnd_` followed by alphanumeric | Gateway refund reference |
| `grossAmount` | `Number` | Yes | - | Positive currency amount | Original gross booking value |
| `deductions` | `Number` | Yes | `0.0` | Non-negative currency amount | Non-refundable fee / cancellation charge |
| `refundAmount` | `Number` | Yes | - | Positive currency amount | Net amount returned to customer |
| `refundAmountPaise`| `Number`| Yes | - | Integer (`refundAmount * 100`) | Exact integer amount refunded |
| `currency` | `String` | Yes | `INR` | 3-letter currency code | E.g. "INR" |
| `reason` | `String` | Yes | - | Enum: `CUSTOMER_REQUESTED`, `SHOW_CANCELLED`, `DOUBLE_BOOKING_FAILSAFE` | Cause of refund |
| `status` | `String` | Yes | `PENDING` | Enum: `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED` | Gateway settlement status |
| `failureReason` | `String` | No | `""` | Gateway error response | Populated if payout fails |
| `initiatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp of refund request |
| `settledAt` | `Date` | No | `null` | ISO Date | Timestamp confirmed by gateway |

#### C. Unique Constraints & Indexes
- **Sparse Unique**: `{ razorpayRefundId: 1 }`.
- **Booking Refund Index**: `{ bookingId: 1 }`.
- **Reconciliation Status Index**: `{ status: 1, initiatedAt: 1 }`.

---

### 2.3 Collection: `payment_webhooks`

#### A. Purpose
Immutable audit log of all raw webhook payloads received from Razorpay. Guarantees idempotency and protects against replay attacks.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `eventId` | `String` | Yes | - | Unique string from Razorpay header | `x-razorpay-event-id` |
| `eventType` | `String` | Yes | - | E.g. `payment.captured`, `payment.failed`, `refund.processed` | Type of event |
| `signature` | `String` | Yes | - | Hex signature string | Received signature header |
| `isSignatureValid`| `Boolean`| Yes | - | Boolean | Result of HMAC validation |
| `payload` | `Object` | Yes | - | Full raw JSON body | Complete unmutated gateway request |
| `processed` | `Boolean` | Yes | `false` | Boolean | True once business logic commits |
| `processedAt` | `Date` | No | `null` | ISO Date | Timestamp of successful processing |
| `errorLog` | `String` | No | `""` | Text | Captured exception if processing failed |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Ingress timestamp |

#### C. Unique Constraints & Indexes
- **Unique**: `{ eventId: 1 }` (Hard barrier preventing duplicate webhook execution).
- **Processing Status Index**: `{ processed: 1, createdAt: 1 }`.
- **TTL Index**: `{ createdAt: 1 }` (Auto-purges raw webhook logs after 90 days).

