# 07 - Show Discovery & Schedule Exploration

## Endpoint Specification

- **HTTP Method**: `GET`
- **Route**: `/api/v1/shows/search`
- **Access Control**: Public

---

## Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `movieId` | `string` | Optional | 24-char ObjectId of the movie |
| `theatreId` | `string` | Optional | 24-char ObjectId of the cinema |
| `branchId` | `string` | Optional | Branch cinema reference |
| `cityId` | `string` | Optional | City filter |
| `date` | `string` | Optional | Calendar date in `YYYY-MM-DD` format |
| `language` | `string` | Optional | Audio language (e.g. `Gujarati`, `Hindi`, `English`) |
| `format` | `string` | Optional | Screen format (`2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX`) |
| `startTimeFrom` | `ISO Date` | Optional | Start time boundary |
| `startTimeTo` | `ISO Date` | Optional | End time boundary |
| `page` | `integer` | Optional | Page number (default 1) |
| `limit` | `integer` | Optional | Results per page (default 20, max 50) |

---

## Business Invariants & Lifecycle Safety

1. **Only Published Shows**:
   - The query filter enforces `status: 'PUBLISHED'` and `isDeleted: false`.
   - `DRAFT`, `SCHEDULED`, `CANCELLED`, or `COMPLETED` shows are excluded from discovery.

2. **Future Screening Window**:
   - `startTime: { $gt: new Date() }` ensures past shows are omitted from customer discovery feeds.

3. **Seat Availability Indicator**:
   - The show document returns `availableSeats` and `totalSeats` snapshots alongside configured `pricingTiers`.
   - **Crucial Notice**: Availability numbers displayed in search results serve as guidance. Authoritative seat reservation is enforced solely via the atomic Redis seat-locking workflow in Part 9.
