# 01. Movie Management Module Overview

## 1. Executive Summary

The **Movie Management Module** is the core catalog engine of the **BookMyShow Clone** platform. It provides centralized movie governance, multi-lingual taxonomy, rich media integration, and multi-faceted discovery across all client applications (Customer Web/Mobile, Theatre Partner Portal, and Super Admin Control Tower).

```
+---------------------------------------------------------------------------------------------------------+
|                                           CLIENT APPLICATIONS                                           |
|       Customer Web / Mobile App       |       Theatre Partner Portal       |       Super Admin CMS      |
+---------------------------------------------------------------------------------------------------------+
                                                     |
                                   HTTPS / TLS 1.3 + WAF + Strict CSP
                                                     v
+---------------------------------------------------------------------------------------------------------+
|                                      API GATEWAY / REVERSE PROXY                                        |
+---------------------------------------------------------------------------------------------------------+
                                                     |
                                                     v
+---------------------------------------------------------------------------------------------------------+
|                                    BACKEND CORE (MODULAR MONOLITH)                                      |
|                                                                                                         |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                                  MIDDLEWARE PIPELINE                                            |   |
|   |   Request-ID -> Security Headers (Helmet) -> Rate Limiter -> Authenticate -> RBAC -> Validation |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                    |                                                    |
|                                                    v                                                    |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                                    MOVIES DOMAIN MODULE                                         |   |
|   |                                                                                                 |   |
|   |   [Admin Movie Routes]                     [Public Movie Routes]       [Taxonomy Routes]        |   |
|   |   - POST   /admin/movies                   - GET /movies               - GET /genres            |   |
|   |   - GET    /admin/movies                   - GET /movies/upcoming      - POST /admin/genres     |   |
|   |   - GET    /admin/movies/:id               - GET /movies/now-showing   - GET /languages         |   |
|   |   - PATCH  /admin/movies/:id               - GET /movies/:slug         - POST /admin/languages  |   |
|   |   - DELETE /admin/movies/:id (Soft-delete)                             - PATCH /admin/genres/:id|   |
|   |   - PATCH  /admin/movies/:id/approve                                   - DELETE /admin/genres/:id|   |
|   |   - PATCH  /admin/movies/:id/reject                                                             |   |
|   |                                                                                                 |   |
|   |   +-------------------+  +-------------------+  +-------------------+  +--------------------+   |   |
|   |   |   MovieService    |  |   GenreService    |  |  LanguageService  |  |    MediaService    |   |   |
|   |   +-------------------+  +-------------------+  +-------------------+  +--------------------+   |   |
|   |             |                      |                      |                      |              |   |
|   |   +-------------------+  +-------------------+  +-------------------+            |              |   |
|   |   |  MovieRepository  |  |  GenreRepository  |  |LanguageRepository |            |              |   |
|   |   +-------------------+  +-------------------+  +-------------------+            |              |   |
|   +----------------------------------------------------------------------------------|--------------+   |
|                                            |                                         |                  |
|                                            v                                         v                  |
|   +------------------------------------------------------------------+   +----------------------+   |
|   |                           MONGODB 7.0+                           |   |      CLOUDINARY      |   |
|   |   Collections: movies, genres, languages, audit_logs             |   | CDN Media Assets     |   |
|   +------------------------------------------------------------------+   +----------------------+   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Architectural Principles & Responsibilities

| Dimension | Architectural Implementation |
| :--- | :--- |
| **Catalog Authority** | Centrally managed by `SUPER_ADMIN`. Theatre partners cannot create or tamper with global movie records. |
| **Public Visibility Shield** | Only movies with approved operational statuses (`APPROVED`, `UPCOMING`, `NOW_SHOWING`) and `isDeleted: false` are accessible to public consumers. |
| **URL-Safe Slugs** | Hyphenated unique slugs (e.g. `/movies/dune-part-two`) with deterministic collision-resolution. |
| **Taxonomic Referencing** | Normalized `genres` and `languages` collections with denormalized slug arrays (`genreSlugs`) for zero-join multi-filter queries. |
| **Soft-Deletion Invariance** | Deleting a movie marks `isDeleted: true` and `deletedAt: Date()`, ensuring historical booking audit trails and financial reports remain intact. |
| **Media Hygiene** | Provider-independent media validation verifying MIME types, max sizes (5MB), categories, and YouTube/Vimeo trailer streaming links. |
| **Audit Observability** | Privileged actions (`MOVIE_CREATED`, `MOVIE_UPDATED`, `MOVIE_DELETED`, `MOVIE_APPROVED`, `MOVIE_REJECTED`) log immutable audit trails. |

