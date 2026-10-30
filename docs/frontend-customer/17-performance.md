# Frontend Performance Optimization & Bundle Strategy
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/17-performance.md`**

---

## 1. Code Splitting & Chunk Strategy

The application leverages dynamic `React.lazy()` imports in `src/app/router/index.jsx` to achieve granular route-based code splitting:
- Initial landing payload (`HomePage`) loads in under **150 KB gzipped**.
- Heavy features (e.g. `SeatSelectionPage`, `PaymentPage`, `DigitalTicketCard`) are loaded asynchronously on-demand when the customer navigates to those stages.

---

## 2. Server-State Caching Strategy

Using **TanStack Query (React Query v5)**:
- **Taxonomic Master Data** (`genres`, `languages`, `cities`): Cached for **30 minutes** (`staleTime: 30 * 60 * 1000`).
- **Movie Catalog & Recommendations**: Cached for **5 minutes** (`staleTime: 5 * 60 * 1000`).
- **Theatres List**: Cached for **10 minutes**.
- **Seat Availability & Statuses**: Short stale window with real-time socket invalidation (`useShowSeatsSocket`). Refetched on window focus or socket event.

---

## 3. Network Optimization
- **Debounced Search**: Autocomplete input uses `useDebounce(query, 300)` to eliminate redundant search suggestions queries during rapid keystrokes.
- **Image Lazy Loading**: All movie poster images include `loading="lazy"` attributes and error fallback placeholders to minimize bandwidth usage on mobile connections.

