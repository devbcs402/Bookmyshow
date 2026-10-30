# 13 - Centralized Search Relevance & Ranking Engine

## Ranking Formula

When consumers execute search with `sortBy=relevance`, [`SearchRankingService`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/discovery/services/search-ranking.service.js) scores matching movies using a weighted multi-factor formula:

$$R = W_{\text{text}} S_{\text{text}} + W_{\text{pop}} S_{\text{pop}} + W_{\text{shows}} S_{\text{shows}} + W_{\text{rate}} S_{\text{rate}} + W_{\text{rec}} S_{\text{rec}}$$

### Configured Weights

| Factor | Weight ($W_i$) | Component ($S_i$) Scoring Criteria |
|---|---|---|
| **Text Relevance** | $0.35$ | $1.0$ (exact title match), $0.85$ (prefix match), $0.65$ (substring title), $0.45$ (cast match), $0.35$ (crew match), $0.20$ (synopsis match) |
| **Popularity** | $0.25$ | $\left(\frac{\text{avgRating}}{10} \times 0.7\right) + \left(\min\left(\frac{\log_{10}(\text{reviews} + 1)}{4}, 1.0\right) \times 0.3\right)$ |
| **Show Availability** | $0.20$ | $1.0$ if movie has active published shows in current/selected city, else $0.0$ |
| **Rating** | $0.10$ | $\frac{\text{avgRating}}{10}$ (normalized from 0 to 1) |
| **Recency** | $0.10$ | Exponential time decay: $\exp\left(-\frac{\Delta\text{days}}{90}\right)$ based on days since theatrical release |

---

## Deterministic Secondary Sorting (Tie-Breaking)

To guarantee consistent pagination without flicker or unstable ordering between requests:

1. **Primary Sort**: Composite Score descending: $R_b - R_a$
2. **Secondary Tie-Breaker**: Release date descending (newer releases win)
3. **Tertiary Tie-Breaker**: Alphabetical title sorting (`localeCompare`)
