# 04. Movie Catalog & Review Subsystem Schema Specification

## 1. Subsystem Architecture & Modeling Decisions

The Movie Catalog subsystem powers discovery, multi-faceted filtering, rich media presentation, and community engagement. 

### Key Modeling Decisions
1. **Embedded Cast and Media**:
   - `cast`, `crew`, and `media` (posters, backdrops, YouTube trailers) are embedded directly within `movies` documents. A movie rarely has more than 50 key actors/crew, resulting in sub-document sizes under 30KB (far below MongoDB's 16MB document limit). This eliminates multiple costly `$lookup` joins on the most frequently read endpoint in the entire platform.
2. **Normalized Taxonomy (`genres`, `languages`)**:
   - `genres` and `languages` are stored in dedicated master collections to enforce consistent naming, clean slugging, and multi-lingual UI categorization. Movies reference these via `ObjectId` arrays with denormalized slug arrays for zero-join indexing.
3. **Independent `movie_reviews` Collection**:
   - Reviews grow unboundedly (thousands of reviews per blockbuster). Consequently, embedding reviews inside `movies` is an anti-pattern. `movie_reviews` is maintained as a separate collection with an enforced verified booking check.

---

## 2. Collection Schemas

### 2.1 Collection: `genres`

#### A. Purpose
Standard taxonomic categories for classifying films.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `name` | `String` | Yes | - | Trim, unique | E.g., "Action", "Sci-Fi", "Drama" |
| `slug` | `String` | Yes | - | Lowercase, hyphenated | E.g., "action", "sci-fi" |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Operational status |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |

#### C. Indexes & Constraints
- **Unique**: `{ slug: 1 }`, `{ name: 1 }`.

---

### 2.2 Collection: `languages`

#### A. Purpose
Spoken and subtitle language master records.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `name` | `String` | Yes | - | Trim, unique | E.g., "Hindi", "English", "Tamil", "Telugu" |
| `code` | `String` | Yes | - | 2-3 char ISO 639-1 code | E.g., "hi", "en", "ta", "te" |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Operational status |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |

#### C. Indexes & Constraints
- **Unique**: `{ code: 1 }`, `{ name: 1 }`.

---

### 2.3 Collection: `movies`

#### A. Purpose
Central entity storing full metadata, trailers, certifications, cast, crew, and aggregate ratings.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `title` | `String` | Yes | - | Trim, min: 1, max: 200 | Movie title |
| `slug` | `String` | Yes | - | Lowercase, hyphenated, unique | URL-friendly identifier |
| `synopsis` | `String` | Yes | - | Min: 20, max: 5000 chars | Plot summary |
| `durationMins` | `Number` | Yes | - | Integer > 0 | Runtime in minutes |
| `releaseDate` | `Date` | Yes | - | ISO Date | Official theatrical release date |
| `censorRating` | `String` | Yes | - | Enum: `U`, `UA`, `UA_13_PLUS`, `UA_16_PLUS`, `A`, `S` | Central Board of Film Certification |
| `genreIds` | `[ObjectId]` | Yes | - | Refs: `genres`, min 1 | Associated genre IDs |
| `genreSlugs` | `[String]` | Yes | - | Array of strings | Denormalized genre slugs for fast indexing |
| `languageIds` | `[ObjectId]` | Yes | - | Refs: `languages`, min 1 | Spoken language IDs |
| `availableFormats`| `[String]` | Yes | - | Enum: `2D`, `3D`, `IMAX_2D`, `IMAX_3D`, `4DX`, `ICE`, `DOLBY_CINEMA` | Supported projection formats |
| `cast` | `[SubDoc]` | Yes | `[]` | Array of Cast Sub-Documents | Key starring actors |
| `crew` | `[SubDoc]` | Yes | `[]` | Array of Crew Sub-Documents | Director, music, producer |
| `posterUrl` | `String` | Yes | - | Valid Cloudinary URL | Vertical portrait banner (2:3 aspect ratio) |
| `backdropUrl` | `String` | Yes | - | Valid Cloudinary URL | Horizontal landscape banner (16:9) |
| `trailerUrl` | `String` | No | `""` | Valid YouTube / Vimeo URL | Embedded promotional video trailer |
| `status` | `String` | Yes | `UPCOMING` | Enum: `UPCOMING`, `NOW_SHOWING`, `ARCHIVED` | Current theatrical status |
| `avgRating` | `Number` | Yes | `0.0` | Range: `0.0` to `10.0` | Weighted aggregate review score |
| `totalReviews` | `Number` | Yes | `0` | Non-negative integer | Total verified reviews count |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### Sub-Document: `cast`
```typescript
{
  actorId: ObjectId, // Optional link if actor registry exists
  name: String,      // Required (e.g. "Cillian Murphy")
  character: String, // E.g. "J. Robert Oppenheimer"
  photoUrl: String   // Cloudinary asset URL
}
```

#### Sub-Document: `crew`
```typescript
{
  name: String,        // Required (e.g. "Christopher Nolan")
  designation: String, // E.g. "Director", "Music Director", "Cinematographer"
  photoUrl: String
}
```

#### C. Unique Constraints & Indexes
- **Unique**: `{ slug: 1 }`.
- **Text Search Index**: `{ title: "text", "cast.name": "text", "crew.name": "text" }` with weights `{ title: 10, "cast.name": 5, "crew.name": 3 }`.
- **Compound Discovery Index**: `{ status: 1, releaseDate: -1, avgRating: -1 }` (Primary movie grid listing).
- **Compound Multi-Filter Index**: `{ status: 1, genreSlugs: 1, availableFormats: 1 }`.

#### D. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f981a" },
  "title": "Interstellar",
  "slug": "interstellar",
  "synopsis": "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
  "durationMins": 169,
  "releaseDate": { "$date": "2026-11-05T00:00:00.000Z" },
  "censorRating": "UA_13_PLUS",
  "genreIds": [{ "$oid": "67220b3f81e7d23a104f9850" }, { "$oid": "67220b3f81e7d23a104f9851" }],
  "genreSlugs": ["sci-fi", "adventure"],
  "languageIds": [{ "$oid": "67220b3f81e7d23a104f9870" }],
  "availableFormats": ["2D", "IMAX_2D", "IMAX_3D"],
  "cast": [
    { "name": "Matthew McConaughey", "character": "Cooper", "photoUrl": "https://res.cloudinary.com/bms/image/upload/v1/actors/mcconaughey.jpg" },
    { "name": "Anne Hathaway", "character": "Brand", "photoUrl": "https://res.cloudinary.com/bms/image/upload/v1/actors/hathaway.jpg" }
  ],
  "crew": [
    { "name": "Christopher Nolan", "designation": "Director", "photoUrl": "https://res.cloudinary.com/bms/image/upload/v1/crew/nolan.jpg" }
  ],
  "posterUrl": "https://res.cloudinary.com/bms/image/upload/v1/movies/interstellar-poster.jpg",
  "backdropUrl": "https://res.cloudinary.com/bms/image/upload/v1/movies/interstellar-backdrop.jpg",
  "trailerUrl": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "status": "NOW_SHOWING",
  "avgRating": 9.2,
  "totalReviews": 4820,
  "deletedAt": null,
  "createdAt": { "$date": "2026-09-01T12:00:00.000Z" },
  "updatedAt": { "$date": "2026-10-30T10:00:00.000Z" }
}
```

---

### 2.4 Collection: `movie_reviews`

#### A. Purpose
Stores user reviews and ratings. Enforces a verified buyer check by linking to a confirmed booking.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `movieId` | `ObjectId` | Yes | - | Ref: `movies` | Reviewed movie |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Reviewing customer |
| `bookingId` | `ObjectId` | Yes | - | Ref: `bookings` | Proof of purchase (verified viewer) |
| `rating` | `Number` | Yes | - | Integer, min: 1, max: 10 | Rating out of 10 |
| `reviewTitle` | `String` | No | `""` | Trim, max: 120 chars | Review headline |
| `comment` | `String` | No | `""` | Trim, max: 2000 chars | Detailed feedback |
| `isVerifiedBooking`| `Boolean`| Yes | `true` | Boolean | True if booking is confirmed & checked in |
| `likesCount` | `Number` | Yes | `0` | Non-negative integer | Helpful thumbs-up votes |
| `isFlagged` | `Boolean` | Yes | `false` | Boolean | Moderation flag for abusive content |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Compound Unique**: `{ customerId: 1, movieId: 1 }` (Strictly one review per user per movie).
- **Lookup Index**: `{ movieId: 1, isFlagged: 1, createdAt: -1 }` (For paginated movie review feeds).

