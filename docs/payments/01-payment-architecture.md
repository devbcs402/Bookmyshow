# Part 11 — Payment Gateway Integration: Architecture & Overview

## 1. Executive Summary

The **Payment Gateway Integration Module** establishes an enterprise-grade, cryptographically verified financial processing pipeline for the BookMyShow clone platform. Built around the **Razorpay** payments infrastructure, this module bridges the gap between reserved inventory (`PENDING_PAYMENT` state in Part 10's Booking Engine) and final ticket issuance (`CONFIRMED` state).

Payment processing in entertainment ticketing requires zero-tolerance for data loss, phantom charges, double confirmation, or orphaned captures. To achieve this, the architecture adopts a strict **Server-Side Trust Model**: client-side payment success responses are treated merely as triggers for server-side verification. No booking is ever confirmed without either a cryptographically verified checkout HMAC signature or an authenticated asynchronous webhook event (`payment.captured`).

---

## 2. Core Architectural Principles

| Principle | Specification | Technical Implementation |
| :--- | :--- | :--- |
| **Zero Trust Client** | Never trust client-reported amounts or statuses | Server generates Razorpay orders strictly from database-persisted booking totals. Amounts sent to gateway are computed in integer paise. |
| **Cryptographic Verifiability** | All state changes require cryptographic proof | Constant-time HMAC-SHA256 signature verification via `crypto.timingSafeEqual` prevents forgery and timing attacks. |
| **Strict Webhook Idempotency** | Webhooks can be received multiple times or out of order | Deduplicated via unique `eventId` indexing with a 90-day MongoDB TTL index (`PaymentWebhook`). |
| **Dual Confirmation Ingestion** | Robustness against lost client connections | Both synchronous verification (`POST /verify`) and asynchronous webhooks (`POST /webhook/razorpay`) can safely confirm bookings without race conditions. |
| **Zero PCI-DSS Footprint** | No card data touches application servers | Cardholder data and UPI PINs are entered exclusively on Razorpay's PCI-DSS Level 1 compliant checkout frame. |
| **Automated Failure & Orphan Reconciliation** | No customer funds lost on booking expiry | If a payment succeeds after booking expiration sweeps, the system records the capture and marks it `REFUND_REQUIRED`. |
| **Multi-Tenant Ownership & BOLA Defense** | Prevent cross-tenant access to payment ledgers | Strict Broken Object Level Authorization checks enforce that customers see only their payments and theatre partners see only payments for their cinemas. |

---

## 3. High-Level Architecture Topology

```mermaid
flowchart TD
    Client["Client App / Web Browser"]
    Gateway["Express Gateway & Security Middlewares"]
    Auth["JWT Authentication & RBAC"]
    PaymentSvc["PaymentService Orchestrator"]
    RazorpaySDK["Razorpay Node.js SDK"]
    RazorpayCloud[("Razorpay Payment Cloud")]
    
    subgraph Storage ["Persistent Storage Layer"]
        PaymentColl[("MongoDB: Payments Collection")]
        RefundColl[("MongoDB: Refunds Collection")]
        WebhookColl[("MongoDB: PaymentWebhooks Collection")]
        BookingColl[("MongoDB: Bookings Collection")]
    end

    subgraph RedisCache ["Ephemeral Cache Layer"]
        RedisHold[("Redis Seat Locks & Expiration")]
    end

    subgraph RealTime ["Real-Time Events"]
        SocketServer["Socket.IO Server (booking:confirmed)"]
    end

    %% Step 1: Create Order
    Client -->|1. POST /payments/create-order| Gateway
    Gateway --> Auth
    Auth --> PaymentSvc
    PaymentSvc -->|Verify Pending Booking| BookingColl
    PaymentSvc -->|Create Order in Paise| RazorpaySDK
    RazorpaySDK -->|API Request| RazorpayCloud
    RazorpayCloud -->|order_id| RazorpaySDK
    PaymentSvc -->|Save Payment (CREATED)| PaymentColl
    PaymentSvc -->|Return order_id & key_id| Client

    %% Step 2: Client Checkout
    Client -->|2. Launch Checkout Modal| RazorpayCloud
    RazorpayCloud -->|3. Return signature & payment_id| Client

    %% Step 3: Verify Signature
    Client -->|4. POST /payments/verify| Gateway
    PaymentSvc -->|5. Verify HMAC-SHA256| PaymentSvc
    PaymentSvc -->|6. Atomic Confirm Booking| BookingColl
    PaymentSvc -->|Update to CAPTURED| PaymentColl
    PaymentSvc -->|Release Ephemeral Hold| RedisHold
    PaymentSvc -->|Emit Ticket Confirmed| SocketServer

    %% Step 4: Asynchronous Webhook
    RazorpayCloud -.->|Webhook: payment.captured| Gateway
    Gateway -->|Verify Webhook HMAC| PaymentSvc
    PaymentSvc -->|Idempotent Confirm / No-Op| BookingColl
    PaymentSvc -->|Audit Webhook Event| WebhookColl
```

---

## 4. Key Module Components

1. **`razorpay.client.js`**:
   - Singleton client wrapper instantiating the official `Razorpay` SDK with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
   - Supports test-environment mock injection for isolated unit testing.
2. **`payment-signature.service.js`**:
   - Computes HMAC-SHA256 digests over `order_id + '|' + payment_id`.
   - Validates webhook payloads against raw request bodies using `crypto.timingSafeEqual`.
3. **`payment-status.service.js`**:
   - Finite State Machine defining permissible transitions for `PaymentStatus` (`CREATED` -> `PENDING` -> `CAPTURED` -> `REFUNDED` / `FAILED`) and `RefundStatus`.
4. **`payment.repository.js`**:
   - Encapsulated Mongoose queries and updates for `Payment`, `Refund`, and `PaymentWebhook` models with MongoDB transaction session propagation.
5. **`payment.service.js`**:
   - Domain orchestrator coordinating order creation, signature verification, webhook handling, and refund management.
6. **`payment-reconciliation.service.js`**:
   - Automated reconciliation engine detecting stuck pending orders and flagging captured payments on expired bookings.

