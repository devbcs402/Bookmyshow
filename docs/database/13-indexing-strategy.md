# 13. Comprehensive Database Indexing Strategy & Performance Tuning

## 1. Indexing Principles & Trade-off Analysis

Indexes are critical for keeping read query latency below our 50ms target. However, in write-heavy transactional engines, excessive indexing introduces write amplification, memory pressure on the WiredTiger cache, and storage overhead.

### Architectural Rules Applied
1. **The Equality-Sort-Range (ESR) Rule**: Compound indexes strictly order equality match keys first, sort criteria second, and range filters last.
2. **Covered Queries**: High-frequency lookups (e.g. checking whether a seat is locked or verifying user credentials) are structured so the index satisfies the query without requiring a document fetch from disk (`totalDocsExamined: 0`).
3. **Partial Indexes**: Sparse/conditional indexes are applied where only a subset of documents are queried (e.g., active unrevoked refresh tokens or non-expired coupons), keeping index memory footprint minimal.
4. **TTL (Time-To-Live) Automation**: Ephemeral data (`refresh_tokens`, `otp_verifications`, `payment_webhooks`, `notifications`) utilizes native MongoDB TTL background purges.

---

## 2. Master Collection Index Specifications

### 2.1 Collection: `users`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ email: 1 }` | Unique | Login authentication & registration lookup: `findOne({ email })`. | Minimal size; mandatory constraint. |
| `{ phone: 1 }` | Unique (Partial: `{ phone: { $exists: true } }`) | Mobile login & SMS dispatch: `findOne({ phone })`. | Partial index avoids indexing null phone values. |
| `{ partnerId: 1, roleCode: 1, isActive: 1 }` | Compound | Partner portal staff directory & permission hydration. | Essential for multi-tenant isolation. |
| `{ isActive: 1, deletedAt: 1 }` | Compound | Filter active non-deleted users during batch operations. | Low write frequency. |

---

### 2.2 Collection: `refresh_tokens`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ tokenHash: 1 }` | Unique | Session validation on `/api/v1/auth/refresh-token`. | High read speed; purged automatically on expiry. |
| `{ expiresAt: 1 }` | TTL (`expireAfterSeconds: 0`) | Background purging of expired sessions. | Zero application maintenance overhead. |
| `{ userId: 1, familyId: 1, isRevoked: 1 }` | Compound | Instant revocation of all tokens in family upon compromise detection. | Fast family revocation. |

---

### 2.3 Collection: `otp_verifications`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ target: 1, purpose: 1, isVerified: 1 }` | Compound | OTP verification check: `find({ target, purpose, isVerified: false })`. | Kept small by aggressive TTL. |
| `{ expiresAt: 1 }` | TTL (`expireAfterSeconds: 0`) | Purges OTP records after 10 minutes. | Eliminates zombie rows. |

---

### 2.4 Collection: `cities`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ slug: 1 }` | Unique | City route lookup: `/city/mumbai`. | Highly static table; zero write cost. |
| `{ coordinates: "2dsphere" }` | Geospatial | Find nearest operational city to user GPS coordinates. | 2dsphere index size is negligible (< 100 cities). |
| `{ isActive: 1, isTopCity: -1, name: 1 }` | Compound | Header city selector modal listing top cities first. | Covered query for city dropdown. |

---

### 2.5 Collection: `movies`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ slug: 1 }` | Unique | Movie landing page: `/movie/interstellar`. | Fast primary read path. |
| `{ status: 1, releaseDate: -1, avgRating: -1 }` | Compound | Primary catalog grid: `find({ status: "NOW_SHOWING" }).sort({ releaseDate: -1 })`. | Aligns with ESR rule; heavily utilized. |
| `{ status: 1, genreSlugs: 1, availableFormats: 1 }` | Compound Multi-key | Faceted sidebar filtering: movies by genre & format. | Multi-key index on arrays; optimized for read filtering. |
| `{ title: "text", "cast.name": "text", "crew.name": "text" }` | Text Index | Global search bar autocomplete & keyword matching. | Heavy index; updated only on movie creation/update. |

---

### 2.6 Collection: `theatres`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ cityId: 1, isActive: 1 }` | Compound | List all operational cinemas in customer's city. | Primary query on theatre listing view. |
| `{ partnerId: 1, isActive: 1 }` | Compound | Tenant isolation: Partner dashboard cinema list. | Enforces partner boundary. |
| `{ location: "2dsphere" }` | Geospatial | Find nearest theatres within $X$ km of customer GPS. | Enables proximity sorting. |
| `{ cityId: 1, slug: 1 }` | Compound Unique | Pretty URL resolution per city: `/mumbai/theatres/pvr-icon`. | Guarantees clean URLs. |

---

### 2.7 Collection: `screens`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ theatreId: 1, screenNumber: 1, deletedAt: 1 }`| Compound Unique | Prevents duplicate screen numbers within the same cinema. | Enforces physical integrity. |
| `{ partnerId: 1, theatreId: 1, isActive: 1 }` | Compound | Tenant-scoped screen management. | Scoped partner management. |

---

### 2.8 Collection: `seats`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ screenId: 1, layoutVersion: 1, seatLabel: 1 }`| Compound Unique | Prevents duplicate seat labels in the same layout version. | Enforces seating integrity. |
| `{ screenId: 1, layoutVersion: 1, gridRow: 1, gridCol: 1 }`| Compound Unique | Prevents overlapping physical seat coordinates. | Prevents SVG rendering collisions. |
| `{ screenId: 1, layoutVersion: 1, isAvailable: 1 }`| Compound | Fast screen template cloning into `show_seats`. | Covered query when scheduling a show. |

---

### 2.9 Collection: `shows`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ cityId: 1, movieId: 1, showDate: 1, status: 1 }`| Compound | **Most critical query in the system**: Returns all showtimes for a movie in a city on a date. | Highly optimized compound index. |
| `{ screenId: 1, startTime: 1, endTime: 1, status: 1 }`| Compound | **Schedule collision check**: Detects overlapping intervals. | Critical for booking integrity. |
| `{ theatreId: 1, showDate: 1, startTime: 1 }` | Compound | Cinema daily schedule timetable view. | Fast schedule rendering. |
| `{ partnerId: 1, showDate: -1 }` | Compound | Partner dashboard schedule management. | Tenant scoped. |

---

### 2.10 Collection: `show_seats`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ showId: 1, seatId: 1 }` | Compound Unique | **Prevents duplicate inventory records per show**. | Crucial database invariant. |
| `{ showId: 1, status: 1 }` | Compound | Returns entire interactive seat map status for customer SVG UI. | Covered query returning seat availability. |
| `{ status: 1, lockedUntil: 1 }` (Partial) | Compound Partial | Sweeper cron finding expired locks: `find({ status: "LOCKED", lockedUntil: { $lt: NOW } })`. | Partial index excludes AVAILABLE/BOOKED seats. |

---

### 2.11 Collection: `bookings`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ bookingReference: 1 }` | Unique | Customer ticket lookup, gate QR scanning verification. | High read speed; unique constraint. |
| `{ customerId: 1, createdAt: -1 }` | Compound | Customer booking history feed: `find({ customerId }).sort({ createdAt: -1 })`. | Primary customer profile query. |
| `{ showId: 1, status: 1 }` | Compound | Box office occupancy calculations and show revenue settlements. | Essential for reporting. |
| `{ partnerId: 1, createdAt: -1 }` | Compound | Partner revenue reconciliation ledger. | Tenant scoped reporting. |
| `{ status: 1, createdAt: 1 }` (Partial) | Compound Partial | Reconciler detecting orphaned `PENDING_PAYMENT` bookings. | Filters only pending records. |

---

### 2.12 Collection: `payments` & `refunds`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ razorpayOrderId: 1 }` | Unique | Webhook lookup: matches incoming Razorpay order ID. | Guarantees instant webhook resolution. |
| `{ razorpayPaymentId: 1 }` | Sparse Unique | Gateway dispute and payment verification query. | Sparse prevents indexing null IDs. |
| `{ bookingId: 1, status: 1 }` | Compound | Checkout verification: links payment to booking. | Fast join replacement. |
| `{ razorpayRefundId: 1 }` (on `refunds`)| Sparse Unique | Gateway refund webhook resolution. | Sparse unique. |

---

### 2.13 Collection: `payment_webhooks`
| Index Specification | Index Type | Purpose / Query Pattern | Write Trade-off / Memory Note |
| :--- | :--- | :--- | :--- |
| `{ eventId: 1 }` | Unique | Webhook idempotency guard: rejects duplicate webhooks. | Mandatory for financial safety. |
| `{ createdAt: 1 }` | TTL (`expireAfterSeconds: 7776000`) | Purges raw webhook audit payloads after 90 days. | Automatic storage reclamation. |

---

## 3. Redundancy Elimination & Anti-Patterns Avoided
- **No Overlapping Prefixes**: We avoided creating single-key indexes on `{ cityId: 1 }` when a compound index on `{ cityId: 1, movieId: 1, showDate: 1 }` already satisfies single-key prefix queries.
- **No Unbounded Array Multi-key Bloat**: We never index dynamic unbounded arrays. Indexing is strictly applied to scalars, bounded arrays (e.g. `genreSlugs` max 4 items), or discrete references.
- **Partial Index Savings**: For transient locks and background sweeps, partial filters reduce index memory consumption by over 90% compared to indexing millions of historical rows.

