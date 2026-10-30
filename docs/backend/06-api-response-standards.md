# 06. Standard API Response Formats & Pagination Utilities

## 1. Uniform Response Envelopes

To maintain seamless API integration across our three client applications (`customer-web`, `theatre-dashboard`, `admin-dashboard`), all endpoints return a uniform response envelope.

---

## 2. Success Response Specification

All successful responses emit HTTP status `200 OK` (or `201 Created` for resource creation) wrapping data in `ApiResponse.success(res, options)`:

```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "67220b3f81e7d23a104f981a",
    "title": "Interstellar",
    "durationMins": 169
  },
  "meta": null
}
```

### 2.1 Paginated Success Response
When queries return lists of resources, the `meta` attribute encapsulates standardized pagination details:

```json
{
  "success": true,
  "message": "Movies retrieved successfully",
  "data": [
    { "id": "67220b3f81e7d23a104f981a", "title": "Interstellar" },
    { "id": "67220b3f81e7d23a104f981b", "title": "Dune: Part Two" }
  ],
  "meta": {
    "totalRecords": 142,
    "currentPage": 1,
    "pageSize": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 3. Pagination Calculator Utility (`src/common/responses/pagination-meta.js`)

The `PaginationMeta` class computes page counts and boundary indicators cleanly:

```javascript
export class PaginationMeta {
  constructor({ totalRecords = 0, currentPage = 1, pageSize = 20 } = {}) {
    this.totalRecords = Math.max(0, Number(totalRecords) || 0);
    this.currentPage = Math.max(1, Number(currentPage) || 1);
    this.pageSize = Math.max(1, Number(pageSize) || 20);
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;
    this.hasNextPage = this.currentPage < this.totalPages;
    this.hasPrevPage = this.currentPage > 1;
  }
}
```

---

## 4. Standard Response Utility Interface (`src/common/responses/api-response.js`)

Controllers interact exclusively with the static `ApiResponse` factory methods:

```javascript
// 1. Return Standard 200 OK
ApiResponse.success(res, {
  message: 'Movies fetched',
  data: moviesList,
  meta: paginationMeta
});

// 2. Return Standard 201 Created
ApiResponse.created(res, {
  message: 'Screen created successfully',
  data: newScreen
});

// 3. Return Standard Error Envelope
ApiResponse.error(res, {
  statusCode: 409,
  message: 'Seat already reserved',
  errorCode: 'SEAT_ALREADY_LOCKED',
  details: { seatId: 'E10' },
  requestId: req.id
});
```

