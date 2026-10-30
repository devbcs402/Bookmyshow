# 01 - Search & Movie Discovery System Architecture

## Executive Overview

The Discovery, Search, and Recommendation Engine for our corporate-level movie ticket booking platform provides low-latency ($< 35\text{ms}$), multi-dimensional exploration across movies, theatres, screens, and published shows. Built on a modular monolith MERN foundation with Redis distributed caching, the discovery subsystem unifies text search, faceted filtering, geospatial theatre radius discovery, explainable personalized recommendations, and real-time show availability checks.

```mermaid
flowchart TD
    Client["Client / Frontend App"] --> Gateway["API Gateway / Express Router"]
    
    Gateway --> SearchRoute["/api/v1/movies/search"]
    Gateway --> FilterRoute["/api/v1/movies (Filters)"]
    Gateway --> UpcomingRoute["/api/v1/movies/upcoming"]
    Gateway --> NowShowingRoute["/api/v1/movies/now-showing"]
    Gateway --> TrendingPopularRoute["/api/v1/movies/trending & popular"]
    Gateway --> SimilarRoute["/api/v1/movies/:id/similar"]
    Gateway --> TheatreRoute["/api/v1/theatres/search"]
    Gateway --> ShowRoute["/api/v1/shows/search"]
    Gateway --> RecRoute["/api/v1/recommendations"]
    Gateway --> SuggestRoute["/api/v1/search/suggestions"]
    Gateway --> HistoryRoute["/api/v1/users/me/recently-viewed"]

    SearchRoute --> SearchService["SearchService"]
    FilterRoute --> FilterService["FilterService"]
    UpcomingRoute --> DiscService["DiscoveryService"]
    NowShowingRoute --> DiscService
    TrendingPopularRoute --> DiscService
    SimilarRoute --> SimilarService["SimilarMoviesService"]
    TheatreRoute --> TheatreDiscService["TheatreDiscoveryService"]
    ShowRoute --> ShowDiscService["ShowDiscoveryService"]
    RecRoute --> RecService["RecommendationService"]
    SuggestRoute --> SearchService
    HistoryRoute --> RecentViewService["RecentlyViewedService"]

    SearchService --> RankingService["SearchRankingService"]
    DiscService --> DiscCache["DiscoveryCacheService"]
    SimilarService --> DiscCache
    TheatreDiscService --> DiscCache
    ShowDiscService --> DiscCache
    RecService --> DiscCache

    DiscCache --> Redis[("Redis Cluster / Invalidation")]
    SearchService --> DiscRepo["DiscoveryRepository"]
    DiscService --> DiscRepo
    TheatreDiscService --> DiscRepo
    ShowDiscService --> DiscRepo
    RecService --> DiscRepo
    RecentViewService --> RecentRepo["RecentlyViewedRepository"]

    DiscRepo --> Mongo[("Authoritative MongoDB Catalogs")]
    RecentRepo --> Mongo
```

---

## Architectural Principles

1. **Replaceable Search Provider Abstraction**:
   - The design decouples query construction from storage mechanics.
   - Built with MongoDB regex and native text search with safe regex escaping (`DiscoveryRepository.escapeRegex`), maintaining compatibility across community MongoDB, Atlas Search, and external engines (Elasticsearch/Typesense).

2. **Published Show Truth Verification**:
   - Movie statuses like `NOW_SHOWING` are descriptive, but true now-showing discovery is guaranteed only when published, uncancelled, bookable show records exist in the requested city and date window.

3. **Strict Catalog Visibility Firewall**:
   - Only movies with status $\in \{\text{APPROVED}, \text{UPCOMING}, \text{NOW\_SHOWING}\}$ and `isDeleted: false` can ever be discovered.
   - Draft, rejected, pending, or archived movies are prevented from leaking at the database query layer.

4. **Multi-Tiered Redis Cache & Invalidation**:
   - Search suggestions, trending velocity, popular rankings, and theatre lists are cached with designated TTLs (5 to 60 minutes).
   - Invalidation hooks trigger targeted invalidation upon movie updates, approvals, archiving, or show scheduling changes.

5. **Explainable Recommendations Without ML Overhead**:
   - Rule-based weighted scoring formula based on user booking history and recently viewed items.
   - Every recommended movie includes a human-readable explanation (`"Recommended because it matches your preferred genres (Gujarati Drama)"`).
