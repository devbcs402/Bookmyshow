# 06 - Theatre Discovery & Geospatial Search

## Endpoint Specification

- **HTTP Method**: `GET`
- **Route**: `/api/v1/theatres/search`
- **Access Control**: Public

---

## Capabilities

The Theatre Discovery API enables customers to discover cinema locations via multiple dimensions:
1. **Administrative Location**: By `cityId`, `city` name, `area` (locality), and `pincode`.
2. **Proximity Search**: By GPS coordinates (`latitude`, `longitude`) with a configurable `radiusKm` (default 15 km, max 100 km).
3. **Amenities & Facilities**: Filtering for premium formats and features (e.g., `DOLBY_ATMOS`, `IMAX`, `WHEELCHAIR_ACCESSIBLE`, `FOOD_COURT`, `PARKING`).
4. **Name / Keyword Search**: Partial case-insensitive text match on theatre name and street.

---

## Geospatial Query Implementation

The `Theatre` collection utilizes a MongoDB `2dsphere` index on `location.coordinates` (`[longitude, latitude]`):

```javascript
theatreSchema.index({ location: '2dsphere' });
```

When `latitude` and `longitude` are supplied, the repository runs a spherical distance search using `$centerSphere`:

```javascript
// Earth radius ≈ 6378.1 km
const radiusRadians = radiusKm / 6378.1;
filter.location = {
  $geoWithin: {
    $centerSphere: [[longitude, latitude], radiusRadians]
  }
};
```

---

## Tenant Data Sanitization & Security

> [!CAUTION]
> **Data Privacy Guarantee**:
> Theatre discovery responses project only public cinema attributes. Sensitive tenant partner references (`partnerId`), commercial contracts, business registration numbers, GSTIN, staff allocations, and internal user references (`createdBy`, `approvedBy`) are excluded at the database projection level.
