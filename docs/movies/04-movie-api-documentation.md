# Movie Module API Documentation

This document provides a comprehensive REST API specification for all public customer endpoints and administrative endpoints implemented in the **Movie Management Module**.

---

## 1. Conventions & Base URLs

- **Base URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer token in the `Authorization` header (`Bearer <access_token>`).
- **Response Format**: All responses adhere to the standard envelope:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Human readable confirmation message",
    "data": {},
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```
- **Paginated Response Envelope**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Movies retrieved successfully",
    "data": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalRecords": 85,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```

---

## 2. Public Catalog Endpoints

### 2.1 List Public Movies
- **Endpoint**: `GET /api/v1/movies`
- **Auth**: None (Public)
- **Description**: Returns a paginated list of publicly visible movies (`APPROVED`, `UPCOMING`, `NOW_SHOWING`) with multi-facet filtering and sorting.

#### Query Parameters:
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `search` | String | No | — | Case-insensitive title search (regex or text search) |
| `genre` | String | No | — | Filter by genre slug (e.g., `action`) |
| `language` | String | No | — | Filter by ISO 639-1 language code (e.g., `en`, `hi`) |
| `format` | String | No | — | Filter by format (`2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX`) |
| `certification` | String | No | — | Censor rating (`U`, `UA`, `UA13_PLUS`, `A`) |
| `sortBy` | String | No | `releaseDate` | Sort field (`releaseDate`, `popularityScore`, `title`, `averageRating`) |
| `sortOrder` | String | No | `desc` | Sort direction (`asc`, `desc`) |
| `page` | Integer | No | `1` | Page number (Min: 1) |
| `limit` | Integer | No | `20` | Items per page (Min: 1, Max: 100) |

#### Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Movies retrieved successfully",
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Dune: Part Two",
      "slug": "dune-part-two",
      "synopsis": "Paul Atreides unites with Chani and the Fremen while seeking revenge...",
      "genres": [
        { "_id": "65f1a2b3c4d5e6f7a8b9c0f1", "name": "Sci-Fi", "slug": "sci-fi" },
        { "_id": "65f1a2b3c4d5e6f7a8b9c0f2", "name": "Adventure", "slug": "adventure" }
      ],
      "languages": [
        { "_id": "65f1a2b3c4d5e6f7a8b9c0e1", "name": "English", "code": "en" }
      ],
      "censorRating": "UA13_PLUS",
      "durationMinutes": 166,
      "releaseDate": "2026-03-01T00:00:00.000Z",
      "availableFormats": ["IMAX_2D", "2D"],
      "posterUrl": "https://res.cloudinary.com/bookmyshow/image/upload/v1/posters/dune2.jpg",
      "bannerUrl": "https://res.cloudinary.com/bookmyshow/image/upload/v1/banners/dune2.jpg",
      "status": "NOW_SHOWING",
      "averageRating": 4.8,
      "totalVotes": 14200
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 2.2 List Now Showing Movies
- **Endpoint**: `GET /api/v1/movies/now-showing`
- **Auth**: None (Public)
- **Description**: Returns movies currently playing in cinemas (`releaseDate <= NOW() <= endDate`).

---

### 2.3 List Upcoming Movies
- **Endpoint**: `GET /api/v1/movies/upcoming`
- **Auth**: None (Public)
- **Description**: Returns upcoming releases (`releaseDate > NOW()`) sorted by release date ascending.

---

### 2.4 Get Movie Details by Slug
- **Endpoint**: `GET /api/v1/movies/:slug`
- **Auth**: None (Public)
- **Description**: Returns complete movie details including cast, crew, media galleries, trailers, and taxonomy. Returns `404 Not Found` if movie is unpublished or soft-deleted.

#### Parameters:
- `slug` (String, required): URL slug (e.g., `dune-part-two`).

#### Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Movie details retrieved successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Dune: Part Two",
    "slug": "dune-part-two",
    "originalTitle": "Dune: Part Two",
    "synopsis": "Paul Atreides unites with Chani and the Fremen while seeking revenge...",
    "genres": [
      { "_id": "65f1a2b3c4d5e6f7a8b9c0f1", "name": "Sci-Fi", "slug": "sci-fi" }
    ],
    "languages": [
      { "_id": "65f1a2b3c4d5e6f7a8b9c0e1", "name": "English", "code": "en" }
    ],
    "censorRating": "UA13_PLUS",
    "durationMinutes": 166,
    "releaseDate": "2026-03-01T00:00:00.000Z",
    "availableFormats": ["IMAX_2D", "2D"],
    "posterUrl": "https://res.cloudinary.com/bookmyshow/image/upload/v1/posters/dune2.jpg",
    "trailerUrl": "https://www.youtube.com/watch?v=Way9Dexny3w",
    "cast": [
      {
        "personName": "Timothée Chalamet",
        "characterName": "Paul Atreides",
        "profilePhotoUrl": "https://res.cloudinary.com/bookmyshow/image/upload/v1/cast/timothee.jpg",
        "order": 1
      }
    ],
    "crew": [
      {
        "personName": "Denis Villeneuve",
        "role": "DIRECTOR",
        "order": 1
      }
    ],
    "status": "NOW_SHOWING",
    "averageRating": 4.8,
    "totalVotes": 14200
  }
}
```

---

### 2.5 List Public Genres & Languages
- **Endpoints**:
  - `GET /api/v1/genres`: Returns all active genres.
  - `GET /api/v1/languages`: Returns all active languages.

---

## 3. Administrative Movie Endpoints

### 3.1 Create Movie
- **Endpoint**: `POST /api/v1/admin/movies`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`, `THEATRE_OWNER`)
- **Required Permission**: `MOVIE_CREATE`

#### Request Body:
```json
{
  "title": "Interstellar",
  "synopsis": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  "genreIds": ["65f1a2b3c4d5e6f7a8b9c0f1"],
  "languageIds": ["65f1a2b3c4d5e6f7a8b9c0e1"],
  "censorRating": "UA",
  "durationMinutes": 169,
  "releaseDate": "2026-11-07T00:00:00.000Z",
  "endDate": "2027-01-15T00:00:00.000Z",
  "availableFormats": ["IMAX_2D", "2D"],
  "posterUrl": "https://res.cloudinary.com/bookmyshow/image/upload/v1/posters/interstellar.jpg",
  "trailerUrl": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "cast": [
    { "personName": "Matthew McConaughey", "characterName": "Cooper", "order": 1 }
  ],
  "crew": [
    { "personName": "Christopher Nolan", "role": "DIRECTOR", "order": 1 }
  ]
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Movie created successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Interstellar",
    "slug": "interstellar",
    "status": "DRAFT",
    "isDeleted": false
  }
}
```

---

### 3.2 List Admin Movies (All Statuses)
- **Endpoint**: `GET /api/v1/admin/movies`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`)
- **Required Permission**: `MOVIE_READ`
- **Description**: Returns all movies including drafts, unapproved, and rejected titles with filtering by status and soft-delete status.

---

### 3.3 Get Admin Movie Details by ID
- **Endpoint**: `GET /api/v1/admin/movies/:movieId`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`)
- **Required Permission**: `MOVIE_READ`

---

### 3.4 Update Movie
- **Endpoint**: `PATCH /api/v1/admin/movies/:movieId`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`, `THEATRE_OWNER`)
- **Required Permission**: `MOVIE_UPDATE`
- **Description**: Partial update of metadata, media assets, cast, crew, or schedule dates.

---

### 3.5 Soft Delete Movie
- **Endpoint**: `DELETE /api/v1/admin/movies/:movieId`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`)
- **Required Permission**: `MOVIE_DELETE`
- **Description**: Soft deletes movie by marking `isDeleted: true`. Returns `200 OK`.

---

### 3.6 Approve Movie
- **Endpoint**: `PATCH /api/v1/admin/movies/:movieId/approve`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`)
- **Required Permission**: `MOVIE_APPROVE`
- **Description**: Transitions movie status from `PENDING_APPROVAL` or `DRAFT` to `APPROVED`, automatically making it discoverable and eligible for show scheduling.

---

### 3.7 Reject Movie
- **Endpoint**: `PATCH /api/v1/admin/movies/:movieId/reject`
- **Auth**: Bearer Token (`SUPER_ADMIN`, `ADMIN`)
- **Required Permission**: `MOVIE_APPROVE`

#### Request Body:
```json
{
  "rejectionReason": "Official CBFC censor certificate documentation is missing."
}
```

---

## 4. Administrative Taxonomy Endpoints

### 4.1 Genres Management
- `POST /api/v1/admin/genres`: Create new genre (`GENRE_MANAGE`).
- `PATCH /api/v1/admin/genres/:genreId`: Update genre name/description (`GENRE_MANAGE`).
- `DELETE /api/v1/admin/genres/:genreId`: Delete genre. Returns `409 Conflict` if genre is referenced by active movies (`GENRE_MANAGE`).

### 4.2 Languages Management
- `POST /api/v1/admin/languages`: Create new language (`LANGUAGE_MANAGE`).
- `PATCH /api/v1/admin/languages/:languageId`: Update language name/script (`LANGUAGE_MANAGE`).
- `DELETE /api/v1/admin/languages/:languageId`: Delete language. Returns `409 Conflict` if language is referenced by active movies (`LANGUAGE_MANAGE`).

---

## 5. Common Error Responses

### 404 Movie Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "errorCode": "MOVIE_NOT_FOUND",
  "message": "Movie not found with identifier: invalid-slug",
  "timestamp": "2026-10-30T10:00:00.000Z"
}
```

### 400 Invalid Status Transition
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "INVALID_STATUS_TRANSITION",
  "message": "Cannot transition movie status from DRAFT directly to APPROVED",
  "timestamp": "2026-10-30T10:00:00.000Z"
}
```

### 409 Resource In Use
```json
{
  "success": false,
  "statusCode": 409,
  "errorCode": "RESOURCE_IN_USE",
  "message": "Cannot delete genre because it is referenced by 14 active movie(s)",
  "timestamp": "2026-10-30T10:00:00.000Z"
}
```

