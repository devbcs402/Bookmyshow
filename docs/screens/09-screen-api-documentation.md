# Screen & Seat Layout API Reference

## 1. Authentication & Base URLs
- **Base URL**: `/api/v1`
- **Owner Scope**: `/api/v1/owner` (Requires JWT Bearer Token with `THEATRE_OWNER` or `SUPER_ADMIN` role).
- **Admin Scope**: `/api/v1/admin/screens` (Requires JWT Bearer Token with `SYSTEM_ADMIN` or `SUPER_ADMIN` role).
- **Public Scope**: `/api/v1/screens`

---

## 2. Screen Management Endpoints

### 2.1 Create Screen under Theatre
- **Endpoint**: `POST /api/v1/owner/theatres/:theatreId/screens`
- **Permissions**: `SCREEN_MANAGE`
- **Request Body**:
```json
{
  "name": "Screen 1 - IMAX with Laser",
  "screenNumber": 1,
  "screenType": "IMAX",
  "supportedFormats": ["2D", "3D", "IMAX_3D"],
  "soundSystem": "Dolby Atmos 12.1",
  "description": "Premium large format auditorium"
}
```
- **Response**: `201 Created`

### 2.2 List Screens for Theatre
- **Endpoint**: `GET /api/v1/owner/theatres/:theatreId/screens`
- **Permissions**: `THEATRE_READ`
- **Response**: `200 OK` with array of screen objects and pagination metadata.

### 2.3 Get Screen Details
- **Endpoint**: `GET /api/v1/owner/screens/:screenId`
- **Permissions**: `THEATRE_READ`
- **Response**: `200 OK`

### 2.4 Update Screen Details
- **Endpoint**: `PATCH /api/v1/owner/screens/:screenId`
- **Permissions**: `SCREEN_MANAGE`
- **Request Body**: Partial screen fields (`name`, `screenNumber`, `screenType`, `supportedFormats`, etc.)
- **Response**: `200 OK`

### 2.5 Update Screen Operational Status
- **Endpoint**: `PATCH /api/v1/owner/screens/:screenId/status`
- **Permissions**: `SCREEN_MANAGE`
- **Request Body**: `{ "status": "MAINTENANCE" }`
- **Response**: `200 OK`

### 2.6 Delete Screen
- **Endpoint**: `DELETE /api/v1/owner/screens/:screenId`
- **Permissions**: `SCREEN_MANAGE`
- **Response**: `200 OK`

---

## 3. Seat Category Endpoints

### 3.1 Create Seat Category
- **Endpoint**: `POST /api/v1/owner/seat-categories`
- **Request Body**:
```json
{
  "name": "VIP Couple Sofa",
  "code": "COUPLE_SOFA",
  "description": "Double plush reclining sofa",
  "displayColor": "#EC4899",
  "basePrice": 600,
  "sortOrder": 1
}
```
- **Response**: `201 Created`

### 3.2 List Partner Categories
- **Endpoint**: `GET /api/v1/owner/seat-categories`
- **Response**: `200 OK` (returns global system categories + partner custom categories)

### 3.3 Update Seat Category
- **Endpoint**: `PATCH /api/v1/owner/seat-categories/:categoryId`
- **Response**: `200 OK`

### 3.4 Delete Seat Category
- **Endpoint**: `DELETE /api/v1/owner/seat-categories/:categoryId`
- **Response**: `200 OK`

---

## 4. Seating Layout Builder Endpoints

### 4.1 Get Layout
- **Endpoint**: `GET /api/v1/owner/screens/:screenId/layout?version=1`
- **Response**: `200 OK` (returns draft if unversioned, or published version)

### 4.2 Save Draft Layout
- **Endpoint**: `POST /api/v1/owner/screens/:screenId/layout`
- **Request Body**:
```json
{
  "name": "IMAX Master Draft Layout",
  "seats": [
    {
      "rowLabel": "A",
      "columnNumber": 1,
      "seatLabel": "A1",
      "categoryCode": "PREMIUM",
      "type": "NORMAL",
      "status": "ACTIVE",
      "gridRow": 0,
      "gridCol": 0,
      "isAvailable": true
    }
  ]
}
```
- **Response**: `200 OK`

### 4.3 Validate Layout (Dry Run)
- **Endpoint**: `POST /api/v1/owner/screens/:screenId/layout/validate`
- **Response**: `200 OK` with `{ "isValid": true, "errors": [], "capacity": {...} }`

### 4.4 Bulk Generate Seats
- **Endpoint**: `POST /api/v1/owner/screens/:screenId/layout/generate`
- **Request Body**: `{ "rows": [...] }`
- **Response**: `200 OK` with generated seats array and capacity metrics.

### 4.5 Preview Layout
- **Endpoint**: `GET /api/v1/owner/screens/:screenId/layout/preview`
- **Response**: `200 OK`

### 4.6 Publish Layout
- **Endpoint**: `POST /api/v1/owner/screens/:screenId/layout/publish`
- **Response**: `200 OK` with `{ "layout": {...}, "version": 2, "totalSeats": 150, "bookableSeats": 148 }`

### 4.7 Get Version History
- **Endpoint**: `GET /api/v1/owner/screens/:screenId/layout/versions`
- **Response**: `200 OK`

---

## 5. Physical Seat Inventory Endpoints

### 5.1 List Seats for Screen
- **Endpoint**: `GET /api/v1/owner/screens/:screenId/seats?version=1`
- **Response**: `200 OK` with list of physical seats.

### 5.2 Get Seat Details
- **Endpoint**: `GET /api/v1/owner/seats/:seatId`
- **Response**: `200 OK`

### 5.3 Update Seat Status
- **Endpoint**: `PATCH /api/v1/owner/seats/:seatId/status`
- **Request Body**: `{ "status": "BLOCKED", "isAvailable": false }`
- **Response**: `200 OK`

