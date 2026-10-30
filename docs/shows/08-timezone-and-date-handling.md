# Timezone & Date Handling Architecture

## 1. Multi-City Timezone Challenges
The platform serves cinemas across diverse metropolitan areas and time zones. Naive assumptions (such as storing dates in server-local time or parsing local string representations) lead to scheduling inaccuracies, daylight-saving errors, and incorrect calendar day filtering.

---

## 2. Core Architectural Principles

### 2.1 Universal UTC Storage
- **All database timestamps** (`startTime`, `endTime`, `occupiedEndTime`, `createdAt`, `updatedAt`) are stored strictly in UTC ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Timestamps represent precise absolute moments in physical time.

### 2.2 Normalized Calendar Day Indexing
- To enable instantaneous searching by calendar day (e.g., "Find all shows on 2026-11-06"), each show stores a normalized `showDate` set to UTC midnight (`00:00:00.000Z`).
- Managed via `normalizeShowDate(inputDate)` in [`show.utils.js`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/shows/show.utils.js).

### 2.3 IANA Timezone Association
- Each cinema multiplex defines its official IANA timezone (e.g., `Asia/Kolkata`, `Asia/Dubai`, `America/New_York`).
- Shows inherit the cinema's timezone (`show.timezone`), enabling mobile and web frontends to accurately render local showtimes to patrons without server-side drift.

---

## 3. Date Validation Pipeline
- Client inputs must be formatted as valid ISO 8601 strings (`z.string().datetime()`).
- Time ranges are mathematically verified: $\text{startTime} < \text{endTime}$.
- Temporal comparison operators (`$lt`, `$gt`) execute on native BSON Date objects, never on string representations.

