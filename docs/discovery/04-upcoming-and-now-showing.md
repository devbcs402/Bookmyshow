# 04 - Upcoming & Now Showing Movie Discovery

## 1. Upcoming Movies (`GET /api/v1/movies/upcoming`)

The upcoming discovery endpoint surfaces anticipated movies scheduled for future theatrical release:

- **Filter Criteria**:
  - `status: { $in: ['UPCOMING', 'APPROVED'] }`
  - `releaseDate: { $gt: now }`
  - `isDeleted: false`
- **Default Sort**: `releaseDate: 1` (soonest releases first)
- **Supported Query Filters**: `genre`, `language`, `page`, `limit`
- **Redis Cache Key**: `discovery:upcoming:<genre>:<lang>:<page>:<limit>` (TTL: 30 minutes)

---

## 2. Now Showing Movies (`GET /api/v1/movies/now-showing`)

### Published Show Truth Verification

Unlike static catalog filters, **Now Showing** discovery strictly adheres to published show records as the single source of truth. A movie marked with `status: 'NOW_SHOWING'` will **NOT** appear in `/api/v1/movies/now-showing` unless it has active, published, and bookable shows.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Controller as DiscoveryController
    participant Service as DiscoveryService
    participant Cache as Redis Cache
    participant Repo as DiscoveryRepository
    participant ShowDB as Show Collection
    participant MovieDB as Movie Collection

    Customer->>Controller: GET /api/v1/movies/now-showing?cityId=rajkot
    Controller->>Service: getNowShowingMovies({ cityId })
    Service->>Cache: GET discovery:now_showing:rajkot:all:all:all:1:20
    alt Cache Hit
        Cache-->>Service: Return cached JSON
    else Cache Miss
        Service->>Repo: findNowShowingMovies({ cityId })
        Repo->>ShowDB: Show.distinct('movieId', { status: 'PUBLISHED', startTime: { $gte: now }, cityId })
        ShowDB-->>Repo: [movieId_A, movieId_B]
        alt No Published Shows
            Repo-->>Service: { movies: [], total: 0 }
        else Shows Found
            Repo->>MovieDB: Movie.find({ _id: { $in: publishedIds }, status: { $in: PublicVisibleStatuses } })
            MovieDB-->>Repo: Hydrated Movie Documents
            Repo-->>Service: { movies, total }
            Service->>Cache: SETEX key 600 JSON
        end
    end
    Service-->>Controller: Formatted payload
    Controller-->>Customer: 200 OK with movies
```

### City & Date Scoping

When `cityId` or `date` is passed:
1. `Show` records are filtered by `cityId` and `startTime` spanning the calendar day.
2. Only movie IDs exhibiting in that city and date window are retrieved.
3. If no published shows exist in that city, an empty list `{ movies: [], total: 0 }` is returned, preventing consumers from attempting to book unavailable movies.
