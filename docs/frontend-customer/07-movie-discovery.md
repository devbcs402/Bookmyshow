# Movie Discovery, Catalog & Recommendations
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/07-movie-discovery.md`**

---

## 1. Discovery Experience Architecture

The discovery subsystem connects patrons to films via:
1. **Hero Premiere Carousel**: Highlights top trending or now-showing releases with full-width backdrops, age certification tags, and instant booking shortcuts.
2. **Personalized Recommendations**: Integrated with `GET /api/v1/recommendations`, querying collaborative filtering and genre affinity algorithms from Part 13.
3. **Now Showing & Upcoming Channels**: Carousels dynamically partitioned by status (`NOW_SHOWING` vs `UPCOMING`).
4. **Genre Exploration Strip**: Quick one-click navigation to genre-filtered catalogs.
5. **Impression & Recently Viewed Tracking**: Automatically dispatches `POST /api/v1/users/me/recently-viewed/:movieId` on viewing a movie details page, rendering the patron's recent history on the homepage.

---

## 2. Multi-Facet Filtering & Search

The `/movies` catalog page provides simultaneous multi-parameter filtering:
- **Genre Filter**: Dynamically populated from `GET /api/v1/genres`.
- **Language Filter**: Dynamically populated from `GET /api/v1/languages`.
- **Status Filter**: `NOW_SHOWING` or `UPCOMING`.
- **Sort Dropdown**: Popularity, Release Date, Title.
- **URL Synchronization**: All filters are synchronized directly into URL query parameters (`/movies?genre=Action&status=NOW_SHOWING&sort=releaseDate`), enabling link sharing and browser history navigation.

