# 17 - Discovery & Search Testing Report

## Executive Summary

The Discovery, Search, Filtering & Recommendation Engine (Part 13) has achieved **100% test pass rate** across all unit and integration test suites.

| Metric | Result |
|---|---|
| **Total Test Suites (Platform-Wide)** | **77 passed, 77 total (100%)** |
| **Total Tests (Platform-Wide)** | **593 passed, 593 total (100%)** |
| **New Part 13 Test Suites** | **8 test suites** |
| **New Part 13 Tests** | **55 tests** |
| **ESLint Compliance** | **0 errors, 0 warnings** |
| **Prettier Formatting** | **100% compliant** |

---

## Part 13 Test Suite Breakdown

### Unit Test Suites (6 Suites, 33 Tests)

1. [`tests/unit/search-query.validation.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/search-query.validation.test.js):
   - Query parameter bounds validation ($2 \le \text{len} \le 100$).
   - ReDoS length rejection (> 100 characters).
   - Allowlisted sort field and order checks.
   - Multi-criteria filter validation (year, duration bounds, certification).
   - Rejection of draft / non-public status in public filter query.
   - Pincode and GPS coordinate validation (-90 to 90, -180 to 180).
   - Show date format validation (`YYYY-MM-DD`).
   - Autocomplete suggestion query validation.

2. [`tests/unit/search-ranking.service.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/search-ranking.service.test.js):
   - Title match scoring: exact match > prefix match > substring match.
   - Cast and crew actor match relevance scoring.
   - Show availability score boosting for currently exhibiting titles.
   - Composite ranking sort order.
   - Deterministic tie-breaking on equal scores (newer release date first).

3. [`tests/unit/similar-movies.service.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/similar-movies.service.test.js):
   - Jaccard similarity index: identical sets ($1.0$), disjoint sets ($0.0$), partial overlap.
   - Multi-feature weighted similarity calculation across genres ($40\%$), languages ($25\%$), cast ($20\%$), and director ($15\%$).
   - Self-exclusion guarantee (source movie never returned).

4. [`tests/unit/recommendation.service.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/recommendation.service.test.js):
   - Customer personalized scoring (+30 genre match, +20 language match, +15 director match, +25 city shows, +10 rating bonus).
   - Exclusion of customer's watched and recently viewed movies.
   - Natural-language explanation string generation.
   - Graceful fallback to anonymous recommendations when history is sparse.
   - Anonymous recommendations based on rating and popularity for guest visitors.

5. [`tests/unit/trending-popular.service.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/trending-popular.service.test.js):
   - Trending velocity formula from confirmed bookings in past 48 hours.
   - Sustained popularity calculation from 30-day booking volume and rating.
   - High-quality fallback to top-rated catalog titles when booking activity is sparse.

6. [`tests/unit/recently-viewed.service.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/unit/recently-viewed.service.test.js):
   - Rejection of non-public / missing movies (`NotFoundError`).
   - In-place timestamp update on repeat viewing (zero duplicates).
   - Paginated history retrieval with deleted movie exclusion.
   - Privacy clear history command.

---

### Integration Test Suites (2 Suites, 22 Tests)

1. [`tests/integration/discovery-search.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/integration/discovery-search.test.js):
   - `GET /api/v1/movies/search`: Full text search with safe regex.
   - `GET /api/v1/movies`: Multi-criteria catalog filtering.
   - `GET /api/v1/movies/upcoming`: Chronologically ordered upcoming movies.
   - `GET /api/v1/movies/now-showing`: Verified against active shows.
   - `GET /api/v1/movies/trending`: Trending velocity payload.
   - `GET /api/v1/movies/popular`: Popular movies over 30 days.
   - `GET /api/v1/movies/:movieId/similar`: Similar movie suggestions.
   - `GET /api/v1/theatres/search`: Location and proximity theatre discovery.
   - `GET /api/v1/shows/search`: Published bookable show schedules.
   - `GET /api/v1/recommendations`: Personalized vs. guest explainable recommendations.
   - `GET /api/v1/search/suggestions`: Fast autocomplete typed suggestions.
   - `POST/GET/DELETE /api/v1/users/me/recently-viewed`: History management.

2. [`tests/integration/discovery-scenarios.test.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/tests/integration/discovery-scenarios.test.js):
   - **Scenario 1: Unpublished Movie Visibility Protection**: Strict exclusion of draft/rejected movies.
   - **Scenario 2: Show Availability Source of Truth**: Exclusion of movies without published shows from now-showing in that location.
   - **Scenario 3: Location Filtering and Tenant Isolation**: Non-leaking of internal partner data in theatre discovery.
   - **Scenario 4: Recommendation Privacy Across Customers**: Strict isolation of Customer A history from Customer B recommendations.
   - **Scenario 5: Cache Invalidation**: Automatic purge of discovery caches upon movie or show mutations.
   - **Scenario 6: Search Abuse Defense**: Safe rejection of oversized queries and regex injection attempts.
