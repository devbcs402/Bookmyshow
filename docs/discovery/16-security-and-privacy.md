# 16 - Security, Privacy & Search Abuse Defense

## 1. Input Sanitization & ReDoS Defense

Search query strings are prone to Regular Expression Denial of Service (ReDoS) if special regex metacharacters (`*`, `+`, `?`, `^`, `$`, `(`, `)`) are unescaped. The discovery layer strictly enforces:
- Max query string length: 100 characters for full search, 50 characters for suggestions.
- Metacharacter neutralization via [`DiscoveryRepository.escapeRegex`](file:///d:/YASH%20KACHA/Bookmyshow/apps/backend/src/modules/discovery/repositories/discovery.repository.js).
- Structured Zod validation schemas that reject unexpected data structures.

---

## 2. Customer Recommendation Privacy

> [!IMPORTANT]
> **Data Isolation Guarantee**:
> Customer recommendation signals (genres, languages, directors, viewed movies) are private to the authenticated customer:
> - Customer A's booking history and viewed titles never leak into Customer B's recommendations.
> - Recommendations for anonymous / guest visitors use aggregate popularity counts only, without any customer-identifiable history.

---

## 3. Catalogue Visibility Firewall

The discovery engine enforces strict visibility boundaries:
- Under no circumstances can `DRAFT`, `PENDING_APPROVAL`, `REJECTED`, or `ARCHIVED` movies appear in public search, filters, recommendations, or suggestions.
- Any attempt to query `?status=DRAFT` through public discovery APIs is rejected with a `400 Validation Error`.

---

## 4. Tenant Partner Data Redaction

Public theatre search queries project only public consumer-facing cinema attributes:
- Tenant partner ID (`partnerId`), commercial settlement terms, banking/GST details, and creator/approver user IDs are stripped at the database projection layer.
