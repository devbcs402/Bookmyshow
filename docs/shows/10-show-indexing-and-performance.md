# Show Indexing Strategy & Performance Architecture

## 1. Indexing Rationale & Patterns
The Show Management module executes two distinct access patterns:
1. **Low-Latency Public Discovery**: Millions of customer queries filtering by city, movie, and show date.
2. **High-Throughput Operational Concurrency**: Continuous collision queries on a specific screen.

---

## 2. Compound Index Specifications

| Collection | Compound Index Keys | Purpose | Equality-Sort-Range (ESR) Compliance |
|---|---|---|---|
| `shows` | `{ screenId: 1, startTime: 1, occupiedEndTime: 1, status: 1 }` | Conflict collision detection | Exact screen equality, interval range |
| `shows` | `{ cityId: 1, movieId: 1, showDate: 1, status: 1 }` | Primary customer movie show listing | City & Movie equality, Date sort/range, Status filter |
| `shows` | `{ theatreId: 1, showDate: 1, startTime: 1 }` | Cinema daily program schedule | Theatre equality, Date equality, Time sort |
| `shows` | `{ partnerId: 1, showDate: -1 }` | Tenant owner management dashboard | Partner equality, Date descending sort |
| `shows` | `{ movieId: 1, status: 1 }` | Title screening status lookup | Movie equality, Status equality |
| `show_pricing` | `{ showId: 1, categoryCode: 1 }` (Unique) | Per-category uniqueness constraint | Show equality, Category equality |
| `show_pricing` | `{ partnerId: 1, showId: 1 }` | Tenant pricing inspection | Partner equality, Show equality |

---

## 3. Denormalization Strategy
- **`cityId` on Show Document**: Eliminates runtime `$lookup` joins between `shows` and `theatres` during high-volume customer city searches.
- **`pricingTiers` Array on Show Document**: Embeds pricing tiers directly within the show document for single-trip fetch operations when users click a showtime.
- **`movieSnapshot` Sub-document**: Preserves title, poster, runtime, and censor rating directly on the show instance, ensuring historical show displays remain intact even if catalog metadata changes in the future.

