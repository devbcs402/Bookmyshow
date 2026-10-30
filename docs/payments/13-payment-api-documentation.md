# Part 11 — Payment Gateway REST API Specification

## 1. Overview

Base URL: `/api/v1/payments`  
Security: Bearer JWT (`Authorization: Bearer <accessToken>`) for client/management endpoints. Razorpay webhook authentication uses HMAC request headers (`x-razorpay-signature`).

---

## 2. Endpoint Index

| Method | Endpoint | Auth Required | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-order` | Yes | All Authenticated | Generate a Razorpay order for an eligible pending booking. |
| `POST` | `/api/v1/payments/verify` | Yes | All Authenticated | Verify client-side checkout HMAC signature and confirm booking. |
| `POST` | `/api/v1/payments/webhook/razorpay` | No (HMAC Header) | Public / Razorpay | Ingest asynchronous payment and refund webhook events. |
| `GET` | `/api/v1/payments/:paymentId` | Yes | Customer (Owner), Partner, Super Admin | Retrieve single payment details, status history, and refunds. |
| `GET` | `/api/v1/bookings/:bookingId/payments` | Yes | Customer (Owner), Partner, Super Admin | Retrieve all payment attempts for a given booking. |
| `POST` | `/api/v1/payments/:paymentId/refunds` | Yes | Theatre Owner, Manager, Super Admin | Initiate an authorized partial or full refund. |

---

## 3. Detailed Endpoint Specifications

### 3.1 Create Payment Order
- **URL**: `POST /api/v1/payments/create-order`
- **Request Body**:
  ```json
  {
    "bookingId": "65f1a2b3c4d5e6f7a8b9c099"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Payment order created successfully",
    "data": {
      "orderId": "order_DBJOWzybf0sJbb",
      "amount": 500,
      "amountPaise": 50000,
      "currency": "INR",
      "keyId": "rzp_test_YourKey123",
      "bookingId": "65f1a2b3c4d5e6f7a8b9c099",
      "bookingReference": "BK-20261030-XYZ789",
      "expiresAt": "2026-10-30T10:05:00.000Z"
    }
  }
  ```

---

### 3.2 Verify Payment & Confirm Booking
- **URL**: `POST /api/v1/payments/verify`
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_DBJOWzybf0sJbb",
    "razorpay_payment_id": "pay_29QQoUBi66xm2f",
    "razorpay_signature": "9ef426ebf606b111a62d53a330070e36e4bb9a0ef44979f8295b882ac377ac82"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payment verified and booking confirmed successfully",
    "data": {
      "payment": {
        "id": "65f1a2b3c4d5e6f7a8b9c088",
        "orderId": "order_DBJOWzybf0sJbb",
        "paymentId": "pay_29QQoUBi66xm2f",
        "status": "CAPTURED",
        "amount": 500
      },
      "booking": {
        "_id": "65f1a2b3c4d5e6f7a8b9c099",
        "bookingReference": "BK-20261030-XYZ789",
        "status": "CONFIRMED",
        "ticketView": {
          "bookingReference": "BK-20261030-XYZ789",
          "movieTitle": "Inception: 15th Anniversary",
          "showDate": "2026-11-05",
          "startTime": "18:30",
          "screenName": "Screen 1 (IMAX Laser)",
          "seatNumbers": ["A1", "A2"],
          "qrToken": "eyJhbGciOiJIUzI1NiIs..."
        }
      }
    }
  }
  ```

---

### 3.3 Razorpay Webhook Ingestion
- **URL**: `POST /api/v1/payments/webhook/razorpay`
- **Headers**:
  - `x-razorpay-signature`: Hex-encoded HMAC-SHA256 digest
  - `x-razorpay-event-id`: Unique Razorpay event identifier
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Webhook processed successfully",
    "data": {
      "received": true,
      "event": "payment.captured"
    }
  }
  ```

---

### 3.4 Initiate Refund
- **URL**: `POST /api/v1/payments/:paymentId/refunds`
- **Request Body**:
  ```json
  {
    "amount": 500,
    "reason": "SHOW_CANCELLED",
    "deductions": 0
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Refund initiated successfully",
    "data": {
      "_id": "65f1a2b3c4d5e6f7a8b9c077",
      "paymentId": "65f1a2b3c4d5e6f7a8b9c088",
      "bookingId": "65f1a2b3c4d5e6f7a8b9c099",
      "razorpayRefundId": "rfnd_K7B4zR5lMn9aX1",
      "refundAmount": 500,
      "status": "SUCCESS",
      "reason": "SHOW_CANCELLED"
    }
  }
  ```

