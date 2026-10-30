# 05. Theatre & Screen Subsystem Schema Specification

## 1. Architectural Tenancy Decision: Partner vs. Theatre

### Decision Record: Tenant Entity Modeling
- **Option A (Theatre as Tenant)**: Treat each physical cinema building (`theatre`) as an independent tenant.
- **Option B (Partner as Tenant - SELECTED)**: Introduce a dedicated `theatre_partners` collection representing the commercial legal entity, with `theatres` representing physical branches/locations owned by that partner.

### Rationale
In enterprise cinema networks (such as PVR INOX, Cinepolis, or SPI Cinemas), a single corporate brand owns dozens of cinema complexes across multiple cities. Settlement accounts (bank accounts, GSTIN, legal agreements) are corporate-level assets, whereas screens and shows are location-level assets. 

Treating `theatre_partners` as the primary **Tenant Boundary (`partnerId`)** provides:
1. **Corporate Aggregation**: Single partner owner login can monitor aggregate revenue, settlements, and staff across all branches.
2. **Branch Hierarchy**: Physical multiplexes are branches (`theatres`) tied to a city and coordinates.
3. **Strict Isolation**: A partner and their delegates (`THEATRE_MANAGER`, `THEATRE_STAFF`) can only query and mutate records where `partnerId` matches their signed JWT claims.

---

## 2. Collection Schemas

### 2.1 Collection: `theatre_partners`

#### A. Purpose
The root tenant entity for cinema businesses. Holds corporate KYC, tax identities, and settlement bank credentials.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key (Tenant ID) |
| `ownerUserId` | `ObjectId` | Yes | - | Ref: `users` | Lead partner owner user account |
| `businessName` | `String` | Yes | - | Trim, min: 3, max: 200 | Registered corporate business name |
| `legalEntityName`| `String` | Yes | - | Trim | Legal trade name |
| `gstin` | `String` | Yes | - | 15-char Indian GSTIN regex | Government Goods & Services Tax ID |
| `pan` | `String` | Yes | - | 10-char Indian PAN regex | Permanent Account Number |
| `bankDetails` | `SubDoc` | Yes | - | Encrypted fields | Settlement account details |
| `kycStatus` | `String` | Yes | `PENDING` | Enum: `PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED` | Super Admin approval state |
| `kycDocuments` | `[SubDoc]`| Yes | `[]` | Array of documents | Uploaded tax / incorporation certificates |
| `rejectionReason`| `String`| No | `""` | Text | Admin feedback if KYC is rejected |
| `commissionRate`| `Number` | Yes | `10.0` | Percentage (e.g., 10%) | Platform commission percentage |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Operational toggle |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### Sub-Document: `bankDetails`
```typescript
{
  accountHolderName: String, // Required
  accountNumberMasked: String, // E.g., "XXXXXXXX4321" (for display)
  accountNumberEncrypted: String, // AES-256-GCM encrypted
  ifscCode: String, // Indian Financial System Code
  bankName: String
}
```

#### C. Unique Constraints & Indexes
- **Unique**: `{ gstin: 1 }`, `{ pan: 1 }`.
- **Tenant Indexes**: `{ ownerUserId: 1 }`, `{ kycStatus: 1, isActive: 1 }`.

---

### 2.2 Collection: `theatres`

#### A. Purpose
Represents a physical cinema multiplex property in a specific city.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `partnerId` | `ObjectId` | Yes | - | Ref: `theatre_partners` | Tenant parent ownership |
| `cityId` | `ObjectId` | Yes | - | Ref: `cities` | Operational municipal city |
| `name` | `String` | Yes | - | Trim, min: 2, max: 200 | Cinema complex name (e.g. "PVR ICON Gold") |
| `slug` | `String` | Yes | - | Lowercase, hyphenated | Unique URL slug |
| `address` | `String` | Yes | - | Full street address | Physical location |
| `landmark` | `String` | No | `""` | Text | Nearby landmark (e.g., "Phoenix Mall, 3rd Floor") |
| `pincode` | `String` | Yes | - | Postal PIN code | Postal area |
| `location` | `Object` | Yes | - | GeoJSON Point (`{ type: "Point", coordinates: [lng, lat] }`) | Exact GPS coordinate |
| `amenities` | `[String]` | No | `[]` | Enum: `PARKING`, `FOOD_COURT`, `WHEELCHAIR_ACCESS`, `DOLBY_ATMOS`, `RECLINERS`, `M_TICKET` | Available cinema amenities |
| `contactPhone` | `String` | Yes | - | E.164 phone string | Box office inquiry contact |
| `contactEmail` | `String` | No | `""` | Email string | Management contact |
| `totalScreens` | `Number` | Yes | `0` | Non-negative integer | Count of auditoriums |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Active status (set false if partner suspended) |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Tenant Scope Index**: `{ partnerId: 1, isActive: 1 }` (Partner cinema queries).
- **City Catalog Index**: `{ cityId: 1, isActive: 1 }` (Customer cinema browsing).
- **Geospatial Index**: `2dsphere` on `location` (Proximity calculation to user).
- **Compound Unique Slug**: `{ cityId: 1, slug: 1 }`.

#### D. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f9911" },
  "partnerId": { "$oid": "67220b3f81e7d23a104f9901" },
  "cityId": { "$oid": "67220b3f81e7d23a104f9701" },
  "name": "PVR ICON: Phoenix Palladium, Lower Parel",
  "slug": "pvr-icon-phoenix-palladium-lower-parel",
  "address": "462, Senapati Bapat Marg, Lower Parel West",
  "landmark": "Level 3, Grand Galleria",
  "pincode": "400013",
  "location": {
    "type": "Point",
    "coordinates": [72.8258, 18.9953]
  },
  "amenities": ["PARKING", "FOOD_COURT", "WHEELCHAIR_ACCESS", "DOLBY_ATMOS", "RECLINERS"],
  "contactPhone": "+912224989100",
  "contactEmail": "icon.palladium@pvr.com",
  "totalScreens": 7,
  "isActive": true,
  "deletedAt": null,
  "createdAt": { "$date": "2026-02-10T08:00:00.000Z" },
  "updatedAt": { "$date": "2026-10-30T10:00:00.000Z" }
}
```

---

### 2.3 Collection: `screens`

#### A. Purpose
Represents an auditorium hall within a cinema property.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `partnerId` | `ObjectId` | Yes | - | Ref: `theatre_partners` | Denormalized tenant ID for zero-join checks |
| `theatreId` | `ObjectId` | Yes | - | Ref: `theatres` | Parent cinema property |
| `name` | `String` | Yes | - | Trim, min: 1, max: 100 | Screen name (e.g. "Audi 1 - IMAX Laser") |
| `screenNumber` | `Number` | Yes | - | Positive integer | Sequence number within multiplex |
| `supportedFormats`| `[String]` | Yes | `["2D"]` | Enum: `2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX` | Projection technologies |
| `soundSystem` | `String` | Yes | `Dolby 7.1` | E.g. "Dolby Atmos 64-Channel", "IMAX 12.1" | Sound capability |
| `totalSeats` | `Number` | Yes | `0` | Positive integer | Total capacity |
| `totalRows` | `Number` | Yes | - | Integer (e.g. 15) | Bounding grid height |
| `totalColumns` | `Number` | Yes | - | Integer (e.g. 24) | Bounding grid width |
| `layoutVersion` | `Number` | Yes | `1` | Integer | Incremented when physical seating is modified |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Set false during renovations |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Compound Unique**: `{ theatreId: 1, screenNumber: 1, deletedAt: 1 }`.
- **Tenant Query Index**: `{ partnerId: 1, theatreId: 1, isActive: 1 }`.
- **Lookup Index**: `{ theatreId: 1, isActive: 1 }`.

