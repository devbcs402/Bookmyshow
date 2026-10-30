# Movie Search, Multi-Facet Filtering, and Pagination

This document outlines the indexing strategy, query construction, multi-facet filtering logic, and pagination design implemented in the **Movie Management Module**.

---

## 1. Search Architecture

The platform supports high-performance movie search for customer discovery across hundreds of titles.

### 1.1 Search Mechanisms

The search pipeline uses a two-tiered strategy:

1. **Text Search Index (Full-Text Matching)**:
   Indexed in MongoDB across title, original title, and synopsis with weighted relevance scoring:
   ```javascript
   movieSchema.index(
     {
       title: 'text',
       originalTitle: 'text',
       synopsis: 'text'
     },
     {
       weights: {
         title: 10,
         originalTitle: 5,
         synopsis: 1
       },
       name: 'movie_text_search_idx'
     }
   );
   ```

2. **Prefix & Partial Substring Search (Regex Fallback)**:
   For quick auto-complete or partial titles, queries match using sanitized, case-insensitive regular expressions:
   ```javascript
   if (filter.search) {
     const sanitized = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     mongoQuery.$or = [
       { title: { $regex: sanitized, $options: 'i' } },
       { originalTitle: { $regex: sanitized, $options: 'i' } }
     ];
   }
   ```

---

## 2. Multi-Facet Filtering

Customers can narrow down movies across multiple dimensions simultaneously:

| Dimension | Filter Parameter | Query Type | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Genre** | `genre` | Slug match | Matches against denormalized `genreSlugs` array in `movies` collection. |
| **Language** | `language` | ISO Code | Matches language ObjectId or code via populated relation. |
| **Format** | `format` | Array Element Match | Matches against `availableFormats` (`2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX`). |
| **Censor Rating** | `certification` | Enum Match | Matches `censorRating` (`U`, `UA`, `UA13_PLUS`, `A`, `S`). |
| **Date Range** | `fromDate`, `toDate` | Range Query | `releaseDate: { $gte: fromDate, $lte: toDate }`. |
| **Theatrical State** | Endpoint-specific | Date comparison | `/now-showing` vs `/upcoming` evaluate against `new Date()`. |

### 2.1 Denormalized `genreSlugs` Optimization
Joining the `genres` collection via `$lookup` for every faceted search creates substantial database CPU overhead. To maintain sub-50ms query response times:
- When a movie is created or updated, the slug of each associated genre is denormalized directly into `movie.genreSlugs: [String]`.
- An index `{ status: 1, isDeleted: 1, genreSlugs: 1 }` enables instant, index-covered filtering without pipeline joins.

---

## 3. Sorting Strategies

The API allows clients to sort results according to customer browsing intent:

| Sort Key | Supported Orders | Use Case |
| :--- | :---: | :--- |
| `releaseDate` *(default)* | `desc` / `asc` | Latest theatrical releases (`desc`) or upcoming anticipation (`asc`). |
| `popularityScore` | `desc` | Trending movies based on trailer views and ticket booking velocity. |
| `averageRating` | `desc` | Highest rated films based on verified user reviews. |
| `title` | `asc` / `desc` | Alphabetical ordering for catalog browse modes. |

---

## 4. Pagination Design & Envelope

The platform implements standard limit-offset pagination with strict upper-boundary protection to prevent unbounded memory consumption.

### 4.1 Boundary Enforcement
- **Default Page**: `1`
- **Minimum Page**: `1`
- **Default Limit**: `20`
- **Maximum Limit**: `100` (Any request requesting $> 100$ items is clamped or rejected by Zod validation)

### 4.2 Standard Pagination Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Movies retrieved successfully",
  "data": [ /* Array of movie objects */ ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalRecords": 85,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  },
  "timestamp": "2026-10-30T10:00:00.000Z"
}
```

---

## 5. MongoDB Indexing Strategy

To guarantee that discovery queries never trigger full collection scans (`COLLSCAN`), the following compound indexes are provisioned on `movies`:

```javascript
// 1. Primary Public Discovery Index
movieSchema.index(
  { status: 1, isDeleted: 1, releaseDate: -1 },
  { name: 'idx_public_movies_release_date' }
);

// 2. Genre Facet Index
movieSchema.index(
  { status: 1, isDeleted: 1, genreSlugs: 1 },
  { name: 'idx_public_movies_genre' }
);

// 3. Format Facet Index
movieSchema.index(
  { status: 1, isDeleted: 1, availableFormats: 1 },
  { name: 'idx_public_movies_format' }
);

// 4. Unique Slug Lookup Index
movieSchema.index(
  { slug: 1 },
  { unique: true, name: 'idx_movies_unique_slug' }
);

// 5. Admin Listing Index
movieSchema.index(
  { isDeleted: 1, createdAt: -1 },
  { name: 'idx_admin_movies_created' }
);
```

