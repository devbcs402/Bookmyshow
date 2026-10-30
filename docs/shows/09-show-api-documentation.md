# Show Management & Scheduling API Documentation

## 1. Authentication & Base URLs
- **Base URL**: `/api/v1`
- **Owner Scope**: `/api/v1/owner/shows` (Requires JWT Bearer Token with `THEATRE_OWNER`, `THEATRE_MANAGER`, or `SUPER_ADMIN` role).
- **Public Scope**: `/api/v1/shows`, `/api/v1/movies/:movieId/shows`, `/api/v1/theatres/:theatreId/shows`

---

## 2. Theatre Owner Endpoints

### 2.1 Schedule Show
- **Method & Route**: `POST /api/v1/owner/shows`
- **Permissions**: `SHOW_CREATE`
- **Request Body**:
```json
{
  "theatreId": "65f1a2b3c4d5e6f7a8b9c0t1",
  "screenId": "65f1a2b3c4d5e6f7a8b9c0s1",
  "movieId": "65f1a2b3c4d5e6f7a8b9c0m1",
  "startTime": "2026-11-06T19:30:00.000Z",
  "format": "IMAX_3D",
  "language": "Hindi",
  "subtitleLanguage": "English",
  "audioFormat": "Dolby Atmos",
  "cleanupBufferMinutes": 20
}
```
- **Response**: `201 Created` with new show document in `DRAFT` status.

### 2.2 List Partner Shows
- **Method & Route**: `GET /api/v1/owner/shows`
- **Permissions**: `SHOW_READ`
- **Query Params**: `theatreId`, `screenId`, `movieId`, `status`, `page`, `limit`
- **Response**: `200 OK` with paginated show records.

### 2.3 Get Show Details
- **Method & Route**: `GET /api/v1/owner/shows/:showId`
- **Permissions**: `SHOW_READ`
- **Response**: `200 OK`

### 2.4 Update Show Metadata
- **Method & Route**: `PATCH /api/v1/owner/shows/:showId`
- **Permissions**: `SHOW_UPDATE`
- **Request Body**: Partial non-schedule updates (`language`, `subtitleLanguage`, `audioFormat`, `format`).

### 2.5 Reschedule Show
- **Method & Route**: `PATCH /api/v1/owner/shows/:showId/reschedule`
- **Permissions**: `SHOW_UPDATE`
- **Request Body**:
```json
{
  "newStartTime": "2026-11-06T20:45:00.000Z",
  "reason": "Pre-show red carpet ceremony"
}
```
- **Response**: `200 OK` with updated interval and `rescheduleHistory` audit item.

### 2.6 Set Show Pricing
- **Method & Route**: `PUT /api/v1/owner/shows/:showId/pricing`
- **Permissions**: `SHOW_UPDATE`
- **Request Body**:
```json
{
  "pricingTiers": [
    { "categoryCode": "REGULAR", "basePrice": 150, "convenienceFee": 15 },
    { "categoryCode": "PREMIUM", "basePrice": 250, "convenienceFee": 20 },
    { "categoryCode": "RECLINER", "basePrice": 450, "convenienceFee": 30 }
  ]
}
```
- **Response**: `200 OK`

### 2.7 Publish Show
- **Method & Route**: `POST /api/v1/owner/shows/:showId/publish`
- **Permissions**: `SHOW_UPDATE`
- **Response**: `200 OK` with show status `PUBLISHED`.

### 2.8 Cancel Show
- **Method & Route**: `POST /api/v1/owner/shows/:showId/cancel`
- **Permissions**: `SHOW_UPDATE`
- **Request Body**: `{ "reason": "Auditorium HVAC breakdown" }`
- **Response**: `200 OK` with show status `CANCELLED`.

---

## 3. Public Customer Endpoints

### 3.1 Search Published Shows
- **Method & Route**: `GET /api/v1/shows`
- **Query Params**: `cityId`, `movieId`, `theatreId`, `date`, `format`, `language`, `page`, `limit`
- **Response**: `200 OK` with active published shows only.

### 3.2 Get Shows for a Movie
- **Method & Route**: `GET /api/v1/movies/:movieId/shows`
- **Query Params**: `cityId`, `date`, `page`, `limit`
- **Response**: `200 OK`

### 3.3 Get Shows for a Theatre
- **Method & Route**: `GET /api/v1/theatres/:theatreId/shows`
- **Query Params**: `date`, `page`, `limit`
- **Response**: `200 OK`

### 3.4 Get Show Details
- **Method & Route**: `GET /api/v1/shows/:showId`
- **Response**: `200 OK` with full public show details, pricing tiers, and layout version reference.

