# 03 - Movie Catalog Multi-Criteria Filtering

## Overview

The Movie Catalog Filtering API (`GET /api/v1/movies`) empowers consumers to slice and dice the movie catalog across dimensions including genre, spoken language, release year, censor rating, formats, duration bounds, and theatrical status.

---

## Allowed Filter Parameters

```
GET /api/v1/movies?genre=action&language=gujarati&status=NOW_SHOWING&releaseYear=2026&durationMin=90&durationMax=180&page=1&limit=20
```

| Parameter | Type | Validation Rule | Behavior |
|---|---|---|---|
| `genre` | `string` | Converted to lowercase slug | Matches in `genreSlugs` array |
| `language` | `string` | 24-char ObjectId or language code (`gu`, `hi`, `en`) | Resolves to `languageIds` |
| `releaseYear` | `integer` | $1900 \le \text{year} \le 2100$ | Generates Jan 1 to Dec 31 range on `releaseDate` |
| `certification` | `string` | Enum `U`, `UA`, `UA_13_PLUS`, `UA_16_PLUS`, `A`, `S` | Filters on `censorRating` |
| `status` | `string` | Must be in `[APPROVED, UPCOMING, NOW_SHOWING]` | Enforces public availability. Non-public statuses reject with 400 |
| `durationMin` | `integer` | Min 1, max 600 mins | Filters `durationMins >= durationMin` |
| `durationMax` | `integer` | Min 1, max 600 mins | Filters `durationMins <= durationMax` |
| `releaseDateFrom` | `ISO Date` | YYYY-MM-DD or ISO 8601 | Filters `releaseDate >= releaseDateFrom` |
| `releaseDateTo` | `ISO Date` | YYYY-MM-DD or ISO 8601 | Filters `releaseDate <= releaseDateTo` |
| `format` | `string` | Enum `2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX`, `ICE` | Filters `availableFormats` |
| `cast` | `string` | Max 100 chars | Matches `cast.name` (case-insensitive) |
| `director` | `string` | Max 100 chars | Matches `crew` where `role: DIRECTOR` |

---

## Security Invariants

> [!IMPORTANT]
> **Zero Draft or Rejected Movie Leakage**:
> The filter engine enforces `isDeleted: false, deletedAt: null, status: { $in: PublicVisibleStatuses }` unconditionally. Attempts by consumers to pass `?status=DRAFT` or `?status=REJECTED` are stopped by Zod validation, returning a `400 Validation Error`.
