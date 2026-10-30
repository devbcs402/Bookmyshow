# 09. Theatre & Branch Module API Documentation

This document provides a comprehensive REST API specification for all Owner, Admin, Branch, Public, and City endpoints implemented in the **Theatre & Branch Management Module**.

---

## 1. Conventions & Response Format

- **Base URL**: `http://localhost:5000/api/v1`
- **Standard Success Envelope**:
  ```json
  {
    "success": true,
    "message": "Human readable confirmation message",
    "data": {},
    "meta": null
  }
  ```
- **Paginated Envelope**:
  ```json
  {
    "success": true,
    "message": "Theatres retrieved successfully",
    "data": [ /* Array of records */ ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalRecords": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```
- **Standard Error Envelope**:
  ```json
  {
    "success": false,
    "message": "Error description",
    "error": {
      "code": "ERROR_CODE_STRING",
      "details": null
    },
    "requestId": "uuid-v4"
  }
  ```

---

## 2. Theatre Owner APIs (`/api/v1/owner/theatres`)

### 2.1 Register New Theatre
- **Method / Path**: `POST /api/v1/owner/theatres`
- **Auth**: Bearer Token (`THEATRE_OWNER`)
- **Permission**: `THEATRE_CREATE`

#### Request Body:
```json
{
  "name": "PVR ICON: Phoenix Palladium",
  "theatreCode": "PVR-MUM-01",
  "description": "Luxury multiplex with IMAX and Gold Class screens",
  "contactEmail": "icon.palladium@pvr.com",
  "contactPhone": "+912224989100",
  "websiteUrl": "https://www.pvrcinemas.com",
  "address": {
    "street": "462, Senapati Bapat Marg",
    "landmark": "High Street Phoenix Mall",
    "area": "Lower Parel",
    "cityId": "65f1a2b3c4d5e6f7a8b9c0c1",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400013"
  },
  "location": {
    "type": "Point",
    "coordinates": [72.8258, 18.9953]
  },
  "operatingHours": {
    "openingTime": "09:00",
    "closingTime": "23:59",
    "operatingDays": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
  },
  "amenities": ["PARKING", "FOOD_BEVERAGES", "WHEELCHAIR_ACCESS", "DOLBY_ATMOS", "IMAX"]
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "message": "Theatre registration request submitted successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0e1",
    "partnerId": "65f1a2b3c4d5e6f7a8b9c0p1",
    "name": "PVR ICON: Phoenix Palladium",
    "slug": "pvr-icon-phoenix-palladium-mumbai",
    "status": "PENDING_APPROVAL",
    "totalScreens": 0,
    "isActive": true,
    "isDeleted": false
  },
  "meta": null
}
```

---

### 2.2 List My Theatres
- **Method / Path**: `GET /api/v1/owner/theatres`
- **Auth**: Bearer Token (`THEATRE_OWNER`)
- **Query Parameters**: `page`, `limit`, `search`, `status`, `cityId`, `sortBy`, `sortOrder`.

---

### 2.3 Get Theatre Details
- **Method / Path**: `GET /api/v1/owner/theatres/:theatreId`
- **Auth**: Bearer Token (`THEATRE_OWNER`)
- **Isolation Guard**: Returns `404 Not Found` if the theatre belongs to another partner.

---

### 2.4 Update Theatre
- **Method / Path**: `PATCH /api/v1/owner/theatres/:theatreId`
- **Auth**: Bearer Token (`THEATRE_OWNER`)
- **Allowed Fields**: `name`, `theatreCode`, `description`, `contactEmail`, `contactPhone`, `websiteUrl`, `address`, `location`, `amenities`. Protected fields (`partnerId`, `status`, etc.) are rejected/ignored.

---

### 2.5 Update Operations & Amenities
- **Method / Path**: `PATCH /api/v1/owner/theatres/:theatreId/operations`
- **Body**: `{ "operatingHours": { ... }, "amenities": [ ... ] }`

---

### 2.6 Update Media Assets
- **Method / Path**: `PATCH /api/v1/owner/theatres/:theatreId/media`
- **Body**: `{ "logoUrl": "...", "posterUrl": "...", "exteriorImages": [...], "interiorImages": [...] }`

---

### 2.7 Soft-Delete Theatre
- **Method / Path**: `DELETE /api/v1/owner/theatres/:theatreId`
- **Guard**: Rejects with `409 Conflict` (`RESOURCE_IN_USE`) if `totalScreens > 0`.

---

### 2.8 Staff Assignment
- `POST /api/v1/owner/theatres/:theatreId/staff`: Assign user as `THEATRE_MANAGER` or `THEATRE_STAFF`.
- `GET /api/v1/owner/theatres/:theatreId/staff`: List assigned managers and staff.
- `DELETE /api/v1/owner/theatres/:theatreId/staff/:userId`: Remove staff member.

---

## 3. Branch Management APIs (`/api/v1/owner`)

- `POST /api/v1/owner/theatres/:theatreId/branches`: Register branch under parent theatre.
- `GET /api/v1/owner/theatres/:theatreId/branches`: List branches under parent theatre.
- `GET /api/v1/owner/branches/:branchId`: Get single branch.
- `PATCH /api/v1/owner/branches/:branchId`: Update branch details.
- `PATCH /api/v1/owner/branches/:branchId/status`: Toggle branch active status (`{ "isActive": false }`).
- `DELETE /api/v1/owner/branches/:branchId`: Soft delete branch.

---

## 4. Super Admin APIs (`/api/v1/admin/theatres`)

- `GET /api/v1/admin/theatres`: List all theatres across all partners with filters (`partnerId`, `status`, `cityId`, `state`, `search`).
- `GET /api/v1/admin/theatres/:theatreId`: View comprehensive theatre dossier.
- `PATCH /api/v1/admin/theatres/:theatreId/approve`: Approve theatre for public exhibition.
- `PATCH /api/v1/admin/theatres/:theatreId/reject`: Reject theatre with `rejectionReason`.
- `PATCH /api/v1/admin/theatres/:theatreId/suspend`: Suspend theatre immediately.
- `PATCH /api/v1/admin/theatres/:theatreId/reactivate`: Reactivate suspended theatre.
- `PATCH /api/v1/admin/theatres/:theatreId`: Administrative metadata override.

---

## 5. Public Cinema Discovery APIs (`/api/v1/theatres` & `/cities`)

### 5.1 Public Theatre Search & Geolocation
- **Method / Path**: `GET /api/v1/theatres`
- **Auth**: None (Public)
- **Query Parameters**:
  - `citySlug` (e.g., `mumbai`)
  - `cityId` (e.g., `65f1a2b3...`)
  - `area` (e.g., `bandra`)
  - `facilities` (e.g., `IMAX,PARKING`)
  - `longitude` (e.g., `72.8258`)
  - `latitude` (e.g., `18.9953`)
  - `radiusKm` (e.g., `10`)
  - `search` (e.g., `palladium`)
- **Guaranteed Invariant**: Strictly filters `{ status: 'APPROVED', isActive: true, isDeleted: false }`.

### 5.2 Get Public Theatre by Slug
- **Method / Path**: `GET /api/v1/theatres/:slug`
- **Response**: Returns cinema details, address, coordinates, and amenities. Returns `404 Not Found` if not approved.

### 5.3 City Master Data
- `GET /api/v1/cities`: List active booking cities sorted with top cities first.
- `POST /api/v1/cities`: Admin endpoint to register new operational cities.

