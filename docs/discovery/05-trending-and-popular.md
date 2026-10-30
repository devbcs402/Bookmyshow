# 05 - Trending & Popular Movies Engine

## Architectural Definitions

To eliminate ambiguity, our platform strictly separates **Trending** from **Popular**:

| Metric | Trending (`GET /movies/trending`) | Popular (`GET /movies/popular`) |
|---|---|---|
| **Measurement Objective** | Recent booking velocity & rapid momentum | Sustained lifetime engagement and reception |
| **Observation Window** | Short window: past 48 hours | Long window: past 30 days |
| **Primary Signals** | Recent confirmed bookings & ticket volume | Cumulative confirmed bookings, avgRating, total reviews |
| **Redis TTL** | 15 minutes (`900s`) | 1 hour (`3600s`) |
| **Fallback Signal** | Highest rated recently released approved movies | Highest rated movies with greatest review volume |

---

## 1. Trending Velocity Formula

Trending velocity measures how fast a movie is currently being booked across theatres:

$$\text{Velocity} = (2 \times \text{ConfirmedBookings}_{48\text{h}}) + \text{TotalSeatsBooked}_{48\text{h}}$$

Where:
- $\text{ConfirmedBookings}_{48\text{h}}$: Count of bookings in status `CONFIRMED` created within the last 48 hours.
- $\text{TotalSeatsBooked}_{48\text{h}}$: Total number of tickets reserved in those confirmed bookings.
- **Integrity Rule**: Failed, cancelled, expired, or refund-pending bookings are excluded from aggregation.

### Fallback Policy
If fewer than `limit` movies have confirmed bookings in the 48-hour window (e.g. low-traffic period), the platform automatically backfills with public movies having high `avgRating` and recent `releaseDate`, tagging them with `isFallbackTrending: true`. Fake random numbers are never generated.

---

## 2. Sustained Popularity Formula

Popularity reflects sustained commercial demand and critical reception over a 30-day window:

$$\text{Score}_{\text{popular}} = (0.7 \times \text{TotalBookings}_{30\text{d}}) + \left(\frac{\text{avgRating}}{10} \times 30\right)$$

Where:
- $\text{TotalBookings}_{30\text{d}}$: Count of confirmed bookings over 30 days.
- $\frac{\text{avgRating}}{10} \times 30$: Rating bonus out of 30 points.
- Secondary sort: `totalReviews: -1, releaseDate: -1`.
