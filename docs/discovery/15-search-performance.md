# 15 - Database Indexing & Query Optimization

## Indexing Strategy Across Collections

To avoid full collection scans (`COLLSCAN`) under heavy search traffic, compound and specialized indexes were introduced:

### 1. Movie Collection (`movies`)
- Text index: `{ title: 'text', 'cast.name': 'text', 'crew.name': 'text' }` with weights `{ title: 10, 'cast.name': 5, 'crew.name': 3 }`
- Compound status & release date: `{ status: 1, releaseDate: -1, avgRating: -1 }`
- Compound genre & format: `{ status: 1, genreSlugs: 1, availableFormats: 1 }`
- Language filter index: `{ status: 1, languageIds: 1, releaseDate: -1 }`
- Upcoming release index: `{ status: 1, isDeleted: 1, releaseDate: 1 }`
- Actor search index: `{ 'cast.name': 1, status: 1, isDeleted: 1 }`
- Director search index: `{ 'crew.name': 1, status: 1, isDeleted: 1 }`

### 2. Theatre Collection (`theatres`)
- Geospatial index: `{ location: '2dsphere' }`
- Administrative location index: `{ 'address.cityId': 1, status: 1, isDeleted: 1 }`
- Area index: `{ 'address.area': 1, status: 1, isDeleted: 1 }`
- Postal pincode index: `{ 'address.pincode': 1, status: 1, isDeleted: 1 }`

### 3. Show Collection (`shows`)
- Public Now Showing lookup: `{ status: 1, startTime: 1, cityId: 1 }`
- Movie shows scheduling index: `{ cityId: 1, movieId: 1, showDate: 1, status: 1 }`
- Theatre schedule lookup: `{ theatreId: 1, showDate: 1, startTime: 1 }`

### 4. Booking Collection (`bookings`)
- Trending & popularity aggregation: `{ status: 1, createdAt: -1, movieId: 1 }` (enables aggregation pipeline to utilize index scans for 48h and 30d time windows).

### 5. Recently Viewed Collection (`recently_viewed`)
- Unique pair index: `{ userId: 1, movieId: 1 }` (unique: true)
- Feed ordering index: `{ userId: 1, viewedAt: -1 }`
