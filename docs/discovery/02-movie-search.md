# 02 - Movie Search API

## Endpoint Specification

- **HTTP Method**: `GET`
- **Route**: `/api/v1/movies/search`
- **Access Control**: Public (No authentication required)
- **Rate Limit**: 60 requests per minute per IP

---

## Query Parameters

| Parameter | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `q` | `string` | Optional | Min 2, max 100 characters | Search string matching title, alt title, cast, crew |
| `genre` | `string` | Optional | Max 50 chars | Genre slug or ObjectId |
| `language` | `string` | Optional | Max 50 chars | Language code (e.g., `hi`, `en`, `gu`) or ObjectId |
| `cast` | `string` | Optional | Max 100 chars | Actor or cast member name |
| `director` | `string` | Optional | Max 100 chars | Filmmaker or director name |
| `certification` | `string` | Optional | Enum `[U, UA, UA_13_PLUS, UA_16_PLUS, A, S]` | Censor certification rating |
| `cityId` | `string` | Optional | 24-char hex ObjectId | City filter for contextual relevance boosting |
| `page` | `integer` | Optional | Default `1`, min `1` | Pagination page number |
| `limit` | `integer` | Optional | Default `20`, min `1`, max `50` | Results per page |
| `sortBy` | `string` | Optional | `relevance`, `releaseDate`, `rating`, `title`, `duration` | Sort criteria |
| `sortOrder` | `string` | Optional | `asc`, `desc` (default `desc`) | Sorting direction |

---

## Safe Query Handling & ReDoS Prevention

Unrestricted user queries passed directly into regular expressions can trigger Regular Expression Denial of Service (ReDoS) or unintended wildcard behavior. To prevent this, all query terms are sanitized using [`DiscoveryRepository.escapeRegex`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/discovery/repositories/discovery.repository.js):

```javascript
static escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

The database query matches across multiple fields using an `$or` expression:

```javascript
const conditions = {
  isDeleted: false,
  deletedAt: null,
  status: { $in: PublicVisibleStatuses },
  $or: [
    { title: regex },
    { originalTitle: regex },
    { 'cast.name': regex },
    { 'crew.name': regex },
    { genreSlugs: regex }
  ]
};
```

---

## Response Structure

```json
{
  "success": true,
  "message": "Movie search results retrieved successfully",
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0aa",
      "title": "Dune: Part Two",
      "slug": "dune-part-two",
      "synopsis": "Paul Atreides unites with Chani and the Fremen...",
      "durationMins": 166,
      "releaseDate": "2026-11-15T00:00:00.000Z",
      "censorRating": "UA_13_PLUS",
      "avgRating": 8.8,
      "totalReviews": 3200,
      "posterUrl": "https://cdn.example.com/dune2-poster.jpg",
      "genreSlugs": ["sci-fi", "adventure", "drama"],
      "availableFormats": ["2D", "IMAX_2D", "4DX"]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```
