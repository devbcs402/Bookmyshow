# 14 - Redis Distributed Caching & Invalidation Architecture

## Discovery Cache Strategy

To support high-concurrency peak traffic (such as major blockbuster ticket sales), discovery results are cached in Redis using deterministic cache keys and TTLs:

| Discovery Category | Cache Key Pattern | TTL | Invalidation Trigger |
|---|---|---|---|
| **Trending Movies** | `discovery:trending:<cityId \| 'all'>:<limit>` | 15 mins (`900s`) | Confirmed booking surge / movie archived |
| **Popular Movies** | `discovery:popular:<cityId \| 'all'>:<limit>` | 1 hour (`3600s`) | Review milestone / movie archived |
| **Upcoming Movies** | `discovery:upcoming:<genre>:<lang>:<page>:<limit>` | 30 mins (`1800s`) | Movie approved or release date changed |
| **Now Showing Movies**| `discovery:now_showing:<cityId>:<date>:<genre>:<lang>:<page>:<limit>` | 10 mins (`600s`) | Show published or cancelled |
| **Search Suggestions**| `discovery:suggestions:<normalizedQuery>` | 15 mins (`900s`) | New movie or theatre published |
| **Similar Movies** | `discovery:similar:<movieId>:<limit>` | 1 hour (`3600s`) | Movie updated or soft-deleted |
| **Theatres List** | `discovery:theatres:<filtersHash>` | 30 mins (`1800s`) | Theatre approved, deactivated, or updated |
| **Shows Search** | `discovery:shows:<filtersHash>` | 5 mins (`300s`) | Show scheduled, published, or cancelled |

---

## Targeted Invalidation Hooks

Cache invalidation is integrated into existing domain lifecycle hooks via [`DiscoveryCacheService`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/discovery/services/discovery-cache.service.js):

1. **Movie Mutations** (`MovieService.updateMovie`, `deleteMovie`, `approveMovie`, `rejectMovie`):
   ```javascript
   await DiscoveryCacheService.invalidateMovieCaches(movieId);
   ```
   Invalidates `discovery:trending:*`, `discovery:popular:*`, `discovery:upcoming:*`, `discovery:now_showing:*`, `discovery:suggestions:*`, and `discovery:similar:<movieId>`.

2. **Show Mutations** (`ShowService.publishShow`, `cancelShow`, `rescheduleShow`):
   ```javascript
   await DiscoveryCacheService.invalidateShowCaches(show.cityId);
   ```
   Invalidates `discovery:now_showing:*`, `discovery:shows:*`, and city-specific discovery caches.

3. **Graceful Redis Degradation**:
   If Redis becomes temporarily unreachable or times out, all cache helpers catch the connection error and fall back to querying MongoDB directly without throwing 500 errors to the customer.
