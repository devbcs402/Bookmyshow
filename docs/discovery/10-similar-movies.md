# 10 - Content-Based Similar Movies Engine

## Endpoint Specification

- **HTTP Method**: `GET`
- **Route**: `/api/v1/movies/:movieId/similar`
- **Access Control**: Public
- **Redis Cache TTL**: 1 hour (`3600s`)

---

## Similarity Algorithm (Weighted Jaccard)

When a customer views movie $A$ and requests similar titles, the platform evaluates candidate public movies $B$ using a weighted multi-feature similarity coefficient:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

$$\text{Similarity}(A, B) = 0.40 \cdot J_{\text{genre}}(A, B) + 0.25 \cdot J_{\text{lang}}(A, B) + 0.20 \cdot J_{\text{cast}}(A, B) + 0.15 \cdot J_{\text{director}}(A, B)$$

### Feature Weights Table

| Feature Dimension | Weight | Metric Evaluation |
|---|---|---|
| **Genre Overlap** | $40\%$ | Jaccard index between `source.genreSlugs` and `candidate.genreSlugs` |
| **Language Match** | $25\%$ | Jaccard index between audio `languageIds` |
| **Cast Overlap** | $20\%$ | Jaccard index across normalized actor names in `cast` |
| **Director Overlap**| $15\%$ | Exact match between primary filmmakers in `crew` (`role: 'DIRECTOR'`) |

---

## Filtering Invariants

1. **Self-Exclusion**: Movie $A$ is excluded from candidate results: `_id: { $ne: movieId }`.
2. **Public Status**: Only approved, publicly available movies are considered.
3. **Thresholding**: Candidate movies with a similarity score of 0 are filtered out.
4. **Ranking Order**: Sorted in descending order of calculated similarity score.
