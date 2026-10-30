# 08. Location-Based Search & Geospatial Discovery

This document details the geospatial architecture, coordinate validation, spatial query construction, and municipal filtering strategies implemented in the **Theatre & Branch Management Module**.

---

## 1. Geospatial Modeling & GeoJSON Specification

To enable high-performance location-based cinema suggestions, physical coordinates are stored using the official **GeoJSON Point** format:

```javascript
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // Stored strictly as [longitude, latitude]
    required: true,
    default: [0, 0]
  }
}
```

> [!IMPORTANT]
> In GeoJSON standard (RFC 7946), coordinates are ordered as **`[longitude, latitude]`** (X then Y), NOT `[latitude, longitude]`. Passing coordinates in reverse order causes spherical projection distortion.

---

## 2. Spherical Indexing with `2dsphere`

A dedicated geospatial index is created on the `location` field:

```javascript
theatreSchema.index({ location: '2dsphere' });
```

### Advantages of `2dsphere`:
- Computes distances using spherical trigonometry on the WGS84 earth ellipsoid.
- Enables lightning-fast `$near` proximity sorting without post-query memory calculation.
- Executes within sub-10ms latency even when querying across tens of thousands of locations.

---

## 3. Public Proximity Search Pipeline

When a customer opens the mobile app or browser and permits GPS geolocation:
1. Client requests: `GET /api/v1/theatres?longitude=72.8258&latitude=18.9953&radiusKm=10`
2. Backend parses and validates coordinates using Zod:
   - Longitude: $\in [-180.0, 180.0]$
   - Latitude: $\in [-90.0, 90.0]$
   - Radius: Default $15\text{ km}$, capped at $100\text{ km}$.
3. Repository builds the atomic geospatial query:
   ```javascript
   query.location = {
     $near: {
       $geometry: {
         type: 'Point',
         coordinates: [longitude, latitude]
       },
       $maxDistance: radiusKm * 1000 // Converted to meters
     }
   };
   ```
4. Results are automatically returned sorted in ascending order of physical proximity to the user.

---

## 4. Multi-Facet Municipal & Attribute Filtering

Customers can combine geographic coordinates with catalog facets:

| Filter Parameter | Target Field | Matching Strategy | Example |
| :--- | :--- | :--- | :--- |
| `citySlug` | `address.cityId` | Resolves slug to `_id` via `cities` collection. | `citySlug=mumbai` |
| `cityId` | `address.cityId` | Exact ObjectId match. | `cityId=65f1a2b3...` |
| `area` | `address.area` | Case-insensitive regex substring. | `area=bandra` |
| `pincode` | `address.pincode` | Exact 6-digit postal code. | `pincode=400050` |
| `facilities` | `amenities` | Array `$all` match for comma-separated amenities. | `facilities=IMAX,PARKING` |
| `search` | `name`, `area`, `street` | Case-insensitive regex or MongoDB text search. | `search=palladium` |

---

## 5. Public Visibility Isolation Guard

All public search queries strictly enforce the public visibility invariant:

```javascript
const query = {
  status: { $in: PublicVisibleTheatreStatuses }, // ['APPROVED']
  isActive: true,
  isDeleted: false,
  ...filter
};
```

Unapproved cinema registrations, rejected submissions, internal drafts, suspended multiplexes, and soft-deleted branches are filtered out directly by the index scan, ensuring that customers are never presented with ineligible or inactive cinemas.

