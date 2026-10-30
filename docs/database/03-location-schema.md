# 03. Geographical & Location Master Schema Specification

## 1. Subsystem Overview

The Location subsystem manages geographical master data for multi-city ticket discovery. In entertainment booking platforms like BookMyShow, the user's active city is the primary root filter for catalog indexing: movie listings, daily schedules, promotional campaigns, and cinema discovery are strictly partitioned by city context.

---

## 2. Collection Schemas

### 2.1 Collection: `countries`

#### A. Purpose
Master list of sovereign countries where the booking platform operates.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `name` | `String` | Yes | - | Trim, unique | Country name (e.g., "India") |
| `code` | `String` | Yes | - | 2-letter ISO 3166-1 alpha-2, UpperCase | E.g., "IN", "AE", "SG" |
| `phoneCode` | `String` | Yes | - | Format: `+` followed by digits | E.g., "+91" |
| `currency` | `String` | Yes | `INR` | 3-letter ISO 4217 code | Currency symbol/code (e.g. "INR", "USD") |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Operational toggle |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Indexes & Constraints
- **Unique**: `{ code: 1 }`, `{ name: 1 }`.
- **Soft Delete**: Yes (`deletedAt`).

---

### 2.2 Collection: `states`

#### A. Purpose
Administrative subdivisions/provinces within a country.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `countryId` | `ObjectId` | Yes | - | Ref: `countries` | Parent country |
| `name` | `String` | Yes | - | Trim | State name (e.g., "Maharashtra", "Karnataka") |
| `code` | `String` | Yes | - | 2-3 char code | E.g., "MH", "KA", "DL" |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Operational status |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Indexes & Constraints
- **Compound Unique**: `{ countryId: 1, code: 1 }`.
- **Lookup Index**: `{ countryId: 1, isActive: 1 }`.

---

### 2.3 Collection: `cities`

#### A. Purpose
Operational municipal areas where theatres reside and showtimes are scheduled. Features GeoJSON coordinates for distance calculations and location-based cinema suggestions.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `stateId` | `ObjectId` | Yes | - | Ref: `states` | Parent state |
| `countryId` | `ObjectId` | Yes | - | Ref: `countries` | Parent country |
| `name` | `String` | Yes | - | Trim | City name (e.g., "Mumbai", "Bengaluru") |
| `slug` | `String` | Yes | - | Lowercase, hyphenated regex | URL slug (e.g., "mumbai", "bengaluru") |
| `isTopCity` | `Boolean` | Yes | `false` | Boolean | Featured in top quick-select city carousel |
| `coordinates` | `Object` | Yes | - | GeoJSON Point (`{ type: "Point", coordinates: [lng, lat] }`) | Center point for geospatial calculations |
| `pincodes` | `[String]` | No | `[]` | Array of valid postal codes | Covered pin codes |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Active operational booking toggle |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Unique**: `{ slug: 1 }`.
- **Geospatial Index**: `2dsphere` on `coordinates` (Used for calculating distance to nearest city center).
- **Compound Filter Index**: `{ isActive: 1, isTopCity: -1, name: 1 }` (Optimizes frontend city picker modal).

#### D. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f9701" },
  "countryId": { "$oid": "67220b3f81e7d23a104f9601" },
  "stateId": { "$oid": "67220b3f81e7d23a104f9651" },
  "name": "Mumbai",
  "slug": "mumbai",
  "isTopCity": true,
  "coordinates": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  },
  "pincodes": ["400001", "400050", "400051", "400099"],
  "isActive": true,
  "deletedAt": null,
  "createdAt": { "$date": "2026-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-10-30T10:00:00.000Z" }
}
```

