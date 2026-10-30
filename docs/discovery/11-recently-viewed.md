# 11 - Customer Recently Viewed History

## Endpoints Specification

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/users/me/recently-viewed/:movieId` | Record a movie view | Yes (`Bearer JWT`) |
| `GET` | `/api/v1/users/me/recently-viewed` | Get paginated viewing history | Yes (`Bearer JWT`) |
| `DELETE` | `/api/v1/users/me/recently-viewed` | Clear viewing history | Yes (`Bearer JWT`) |

---

## Data Schema & Storage

The `recently_viewed` collection tracks movie engagement per customer:

```javascript
const recentlyViewedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'movies', required: true, index: true },
  viewedAt: { type: Date, default: Date.now, index: true }
});

// Enforces unique customer-movie pair
recentlyViewedSchema.index({ userId: 1, movieId: 1 }, { unique: true });

// Enables fast descending timeline pagination
recentlyViewedSchema.index({ userId: 1, viewedAt: -1 });
```

---

## Deduplication & History Limit Policy

1. **Upsert Semantics**: If a customer navigates to the same movie multiple times, the record is updated in place via `findOneAndUpdate` with `$set: { viewedAt: new Date() }`. No duplicate movie entries are created.
2. **Cap Limit**: A customer's viewing history is capped at 50 records. An asynchronous pruning process (`trimHistory`) purges the oldest entries beyond the limit.
3. **Privacy Compliance**: Customers can clear their viewing history at any time via `DELETE /api/v1/users/me/recently-viewed`.
