# Part 10 — Booking Engine REST API Reference

## 1. Executive Summary

This document specifies the public and protected REST API endpoints exposed by the Booking Engine Module. All responses conform to the standard corporate `ApiResponse` schema with envelope structures (`success`, `data`, `meta`, `error`).

---

## 2. API Endpoint Catalog

| HTTP Method | Route | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings` | `CUSTOMER`, `ADMIN` | Initiates checkout, locks seats, calculates pricing, creates pending booking. |
| `GET` | `/api/v1/bookings/:bookingId` | `CUSTOMER`, `PARTNER`, `ADMIN` | Retrieves comprehensive booking details and cryptographic QR ticket. |
| `GET` | `/api/v1/bookings/reference/:reference` | `CUSTOMER`, `PARTNER`, `ADMIN` | Fetches booking by alphanumeric reference/PNR (`BK-YYYYMMDD-XXXXXX`). |
| `GET` | `/api/v1/users/me/bookings` | `CUSTOMER` | Paginated listing of the authenticated customer's personal booking history. |
| `GET` | `/api/v1/bookings/me` | `CUSTOMER` | Canonical alias for user personal booking history. |
| `POST` | `/api/v1/bookings/:bookingId/cancel` | `CUSTOMER`, `ADMIN` | Cancels an eligible booking and releases seats back to inventory. |
| `GET` | `/api/v1/owner/bookings` | `THEATRE_OWNER`, `CINEMA_MANAGER` | Tenant-isolated query of bookings across partner-owned theatres and screens. |

---

## 3. Detailed Endpoint Specifications

### 3.1 Create Booking
- **URL**: `POST /api/v1/bookings`
- **Headers**:
  - `Authorization: Bearer <access_token>` (Required)
  - `Idempotency-Key: <uuid>` (Optional, recommended)
- **Request Body**:
```json
{
  "showId": "65f1a2b3c4d5e6f7a8b9c010",
  "seatIds": [
    "65f1a2b3c4d5e6f7a8b9c0a1",
    "65f1a2b3c4d5e6f7a8b9c0a2"
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Booking created successfully in PENDING_PAYMENT state",
  "data": {
    "id": "67220b3f81e7d23a104f9d01",
    "bookingReference": "BK-20261030-W9K2Q1",
    "customerId": "65f1a2b3c4d5e6f7a8b9c001",
    "theatreId": "65f1a2b3c4d5e6f7a8b9c0t1",
    "screenId": "65f1a2b3c4d5e6f7a8b9c0s1",
    "showId": "65f1a2b3c4d5e6f7a8b9c010",
    "totalSeats": 2,
    "baseAmount": 800.0,
    "convenienceFee": 60.0,
    "taxAmount": 10.8,
    "discountAmount": 0.0,
    "netPayableAmount": 870.8,
    "currency": "INR",
    "status": "PENDING_PAYMENT",
    "snapshot": {
      "movieTitle": "Inception",
      "theatreName": "PVR ICON: Gold Class",
      "screenName": "Audi 1",
      "seatSummary": "A1, A2"
    },
    "qrCodePayload": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresAt": "2026-10-30T10:15:00.000Z"
  }
}
```

---

### 3.2 Get Booking Details
- **URL**: `GET /api/v1/bookings/:bookingId`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Booking details retrieved successfully",
  "data": {
    "booking": {
      "id": "67220b3f81e7d23a104f9d01",
      "bookingReference": "BK-20261030-W9K2Q1",
      "status": "CONFIRMED",
      "netPayableAmount": 870.8
    },
    "ticket": {
      "bookingId": "67220b3f81e7d23a104f9d01",
      "bookingReference": "BK-20261030-W9K2Q1",
      "movieTitle": "Inception",
      "theatreName": "PVR ICON: Gold Class",
      "screenName": "Audi 1",
      "seats": ["A1", "A2"],
      "status": "CONFIRMED",
      "qrToken": "eyJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

---

### 3.3 List Customer Booking History
- **URL**: `GET /api/v1/users/me/bookings?page=1&limit=10&status=CONFIRMED`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User booking history retrieved successfully",
  "data": [
    {
      "id": "67220b3f81e7d23a104f9d01",
      "bookingReference": "BK-20261030-W9K2Q1",
      "status": "CONFIRMED",
      "totalSeats": 2,
      "netPayableAmount": 870.8,
      "snapshot": {
        "movieTitle": "Inception",
        "showStartTime": "2026-11-06T19:30:00.000Z"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 3.4 Cancel Booking
- **URL**: `POST /api/v1/bookings/:bookingId/cancel`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "reason": "Family emergency; rescheduling"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Booking successfully cancelled and inventory released",
  "data": {
    "bookingId": "67220b3f81e7d23a104f9d01",
    "bookingReference": "BK-20261030-W9K2Q1",
    "status": "CANCELLED",
    "cancellation": {
      "cancelledAt": "2026-10-30T10:30:00.000Z",
      "reason": "Family emergency; rescheduling",
      "refundableAmount": 870.8,
      "refundStatus": "PENDING"
    }
  }
}
```

