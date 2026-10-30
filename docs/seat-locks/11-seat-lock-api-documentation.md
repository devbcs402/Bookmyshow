# Part 9 — Seat Availability & Locking REST API Reference

## Base URL
```
/api/v1/shows
```

---

## 1. Get Seat Availability & Screen Layout
Retrieves the real-time seating grid, category pricing, and seat statuses for a given show.

- **Method**: `GET`
- **Route**: `/:showId/seats`
- **Authentication**: Public (Optional Bearer Token to distinguish `LOCKED_BY_ME` vs `LOCKED_BY_OTHER`)
- **Headers**:
  ```http
  Authorization: Bearer <accessToken> (optional)
  ```

### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `showId` | String (24-hex ObjectId) | Yes | MongoDB ID of the published show |

### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat availability retrieved successfully",
  "data": {
    "showId": "67220b3f81e7d23a104f9b01",
    "screenId": "67220b3f81e7d23a104f9951",
    "layoutVersion": 1,
    "showStatus": "PUBLISHED",
    "isBookable": true,
    "viewerUserId": "65f1a2b3c4d5e6f7a8b9c0u1",
    "summary": {
      "totalPhysicalSeats": 250,
      "availableSeats": 220,
      "lockedSeats": 10,
      "bookedSeats": 15,
      "maintenanceSeats": 5
    },
    "pricingTiers": [
      {
        "categoryCode": "RECLINER",
        "categoryName": "Royal Recliner",
        "basePrice": 450.0,
        "effectivePrice": 531.0
      }
    ],
    "rows": [
      {
        "rowLabel": "A",
        "categoryCode": "RECLINER",
        "seats": [
          {
            "seatId": "65f1a2b3c4d5e6f7a8b9c0f3",
            "seatLabel": "A1",
            "columnNumber": 1,
            "gridCol": 0,
            "categoryCode": "RECLINER",
            "type": "RECLINER",
            "price": 531.0,
            "basePrice": 450.0,
            "status": "AVAILABLE",
            "isSelectable": true,
            "lockedUntil": null,
            "accessibility": {
              "isWheelchairAccessible": false,
              "hasCompanionSeat": false
            }
          }
        ]
      }
    ]
  }
}
```

---

## 2. Acquire Temporary Multi-Seat Locks
Atomically acquires temporary locks on up to 10 seats for 300 seconds.

- **Method**: `POST`
- **Route**: `/:showId/seat-locks`
- **Authentication**: Required (`CUSTOMER`, `THEATRE_OWNER`, `SUPER_ADMIN`)
- **Headers**:
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  x-idempotency-key: <uuid-or-string> (optional)
  ```

### Request Body
```json
{
  "seatIds": [
    "65f1a2b3c4d5e6f7a8b9c0f3",
    "65f1a2b3c4d5e6f7a8b9c0f4"
  ]
}
```

### Success Response (`201 Created`)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Seats locked successfully",
  "data": {
    "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
    "showId": "67220b3f81e7d23a104f9b01",
    "userId": "65f1a2b3c4d5e6f7a8b9c0u1",
    "lockedSeats": [
      {
        "seatId": "65f1a2b3c4d5e6f7a8b9c0f3",
        "seatLabel": "A1",
        "categoryCode": "RECLINER",
        "unitPrice": 531.0
      },
      {
        "seatId": "65f1a2b3c4d5e6f7a8b9c0f4",
        "seatLabel": "A2",
        "categoryCode": "RECLINER",
        "unitPrice": 531.0
      }
    ],
    "expiresAt": "2026-11-06T19:05:00.000Z",
    "ttlSeconds": 300,
    "remainingSeconds": 300,
    "renewalCount": 0,
    "maxRenewals": 2
  }
}
```

### Error Responses
- `400 Bad Request`: `seatIds` missing, empty, or exceeds 10 items.
- `401 Unauthorized`: Token missing or invalid.
- `404 Not Found`: Show does not exist or seats do not belong to show's layout.
- `409 Conflict`: One or more requested seats are already locked or booked (`SEAT_UNAVAILABLE`).

---

## 3. Release Temporary Seat Locks
Safely releases held seats if caller holds matching `lockId` and authenticated `userId`.

- **Method**: `DELETE`
- **Route**: `/:showId/seat-locks`
- **Authentication**: Required
- **Headers**:
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```

### Request Body
```json
{
  "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
  "seatIds": [
    "65f1a2b3c4d5e6f7a8b9c0f3",
    "65f1a2b3c4d5e6f7a8b9c0f4"
  ]
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat locks released successfully",
  "data": {
    "releasedSeatIds": [
      "65f1a2b3c4d5e6f7a8b9c0f3",
      "65f1a2b3c4d5e6f7a8b9c0f4"
    ]
  }
}
```

---

## 4. Renew Temporary Seat Locks
Extends lock expiration by 300 seconds (up to 2 times).

- **Method**: `PATCH`
- **Route**: `/:showId/seat-locks/renew`
- **Authentication**: Required
- **Headers**:
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```

### Request Body
```json
{
  "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
  "seatIds": [
    "65f1a2b3c4d5e6f7a8b9c0f3"
  ]
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seat locks renewed successfully",
  "data": {
    "lockId": "c6a32d1f-8e4b-4a5c-9c71-2b0f4a8d9e23",
    "showId": "67220b3f81e7d23a104f9b01",
    "userId": "65f1a2b3c4d5e6f7a8b9c0u1",
    "lockedSeats": [
      {
        "seatId": "65f1a2b3c4d5e6f7a8b9c0f3",
        "seatLabel": "A1",
        "categoryCode": "RECLINER",
        "unitPrice": 531.0
      }
    ],
    "expiresAt": "2026-11-06T19:10:00.000Z",
    "ttlSeconds": 300,
    "remainingSeconds": 300,
    "renewalCount": 1,
    "maxRenewals": 2
  }
}
```

### Error Responses
- `404 Not Found`: Lock expired or non-existent (`LOCK_EXPIRED`).
- `409 Conflict`: Maximum renewals reached (`LOCK_LIMIT_EXCEEDED`).

