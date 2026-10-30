# 19. Database Architecture Review Report & Readiness Audit

## 1. Executive Summary & Review Scope

As Principal Database Architect, I have conducted an exhaustive architectural review and audit of the complete database design for the **Movie Ticket Booking Platform (BookMyShow Clone)**. 

The audit evaluated 24 collections across 8 operational domains, verifying schema consistency, relational integrity, zero double-booking concurrency guarantees, multi-tenant data isolation, index optimization, and regulatory security compliance (DPDP / GDPR / PCI-DSS).

---

## 2. Issues Assessment & Architectural Mitigations

### 2.1 Critical Issues (Identified & Resolved)
| Issue Code | Description | Architectural Risk | Resolution & Design Safeguard |
| :---: | :--- | :--- | :--- |
| **C-01** | Concurrent Seat Reservation Race Condition | Two users selecting the same seat simultaneously causing double-booking. | Enforced **Redis atomic Lua script locking** paired with a **Compound Unique Index `{ showId: 1, seatId: 1 }`** on `show_seats` and conditional atomic writes (`status: 'AVAILABLE' -> 'LOCKED'`). |
| **C-02** | Late Payment Capture After Hold Timeout | Customer completes payment after the 10-minute hold expires and seat is re-allocated. | Handled via **Conditional Webhook Reconciliation**: if the seat is still free, the booking is honored; if resold, the system automatically triggers a **100% automated refund via Razorpay Refund API**. |
| **C-03** | Cross-Tenant Data Access (BOLA / IDOR) | Malicious partner accessing another cinema's revenue or show schedules. | Enforced **Repository-Level Tenancy Scoping**: all tenant queries automatically inject `partnerId` derived from the cryptographically verified JWT session. |

### 2.2 High-Priority Issues (Identified & Resolved)
| Issue Code | Description | Architectural Risk | Resolution & Design Safeguard |
| :---: | :--- | :--- | :--- |
| **H-01** | Screen Reconfiguration Corrupting Historical Bookings | Modifying an auditorium's physical layout alters past ticket receipts. | Introduced **Immutable Layout Versioning (`layoutVersion`)**: past shows and bookings remain bound to Version 1; renovations increment the version to 2. |
| **H-02** | Overlapping Showtimes on the Same Screen | Scheduling Screen 1 for two different movies at overlapping intervals. | Implemented **Temporal Interval Collision Query** (`start < existing.end AND end > existing.start`) backed by optimistic version checks on the screen. |
| **H-03** | Webhook Replay Attacks & Duplicate Processing | Duplicate gateway events double-crediting bookings or firing repeated tickets. | Implemented **Distributed Idempotency Keys** with a Unique Index on `payment_webhooks.eventId`. |

### 2.3 Medium-Priority Issues (Identified & Resolved)
| Issue Code | Description | Architectural Risk | Resolution & Design Safeguard |
| :---: | :--- | :--- | :--- |
| **M-01** | Unbounded Review & Notification Growth | Documents exceeding MongoDB 16MB BSON ceiling. | Normalized `movie_reviews` and `notifications` into dedicated collections with TTL indexes on ephemeral alerts. |
| **M-02** | Offset Pagination Degradation on Large Tables | `skip(100000)` query timeouts on audit logs and booking history. | Mandated **Deterministic Keyset (Cursor) Pagination** using monotonic `_id` indexing. |

---

## 3. Architecture Decision Records Summary (Part 2)

- **ADR-DB-01: Shared Database with Discriminator (`partnerId`) Multi-Tenancy**: Rejected DB-per-tenant to prevent connection pool exhaustion and allow unified cross-cinema movie searches.
- **ADR-DB-02: Embedded Line Items with Normalized Show Seats**: Embedded `bookings.seats` for atomic single-document ticket reads, paired with normalized `show_seats` for atomic concurrency control.
- **ADR-DB-03: Layout Versioning for Screen Renovations**: Replaced destructive in-place seat modifications with layout version snapshots.
- **ADR-DB-04: Redis In-Memory Locks with MongoDB Durable Consistency**: Positioned Redis as the low-latency hold tier while establishing MongoDB WiredTiger as the permanent system of record.
- **ADR-DB-05: Zero PCI-DSS Cardholder Footprint**: Enforced hosted tokenization via Razorpay iframe; zero credit card PAN or CVV storage.

---

## 4. Remaining Systemic Risks & Mitigations

1. **Massive Spike on Flash Ticket Sales**:
   - *Risk*: 50,000 users attempting to load the seat map for a blockbuster within 5 seconds.
   - *Mitigation*: Redis caching of show seat maps using Stale-While-Revalidate pattern; Socket.IO broadcasting seat lock deltas so clients don't poll the database.
2. **MongoDB Replica Step-down During Transaction**:
   - *Risk*: Primary node elections causing `TransientTransactionError`.
   - *Mitigation*: Built-in exponential backoff retry loop (`runInTransaction`) handling transient rollback errors automatically.

---

## 5. Final Part 2 Quality Checklist

- [x] **24 Collections Designed**: Every collection has documented purpose, field types, validation rules, unique constraints, and ownership.
- [x] **No Duplicate / Redundant Collections**: Unified `theatre_branches` into `theatres`, embedded media and cast into `movies`, embedded pricing into `shows`.
- [x] **All Relationships Documented**: Complete ER model and cardinality documented in `12-relationship-diagrams.md` and `ERD.mmd`.
- [x] **Indexes Optimized**: ESR rules applied; unique, compound, TTL, text, and 2dsphere indexes documented for all high-volume query paths.
- [x] **Multi-Tenant Isolation Enforced**: Discriminator `partnerId` injected at repository level; cross-tenant BOLA attacks mitigated.
- [x] **Double-Booking Defenses Formulated**: Compound unique index on `show_seats`, atomic conditional updates, and solutions for all 7 edge cases.
- [x] **Layout Mutation Safe**: Layout versioning guarantees historical ticket validity.
- [x] **Security & DPDP Hardening**: Least privilege DB roles, AES-256 field encryption for bank details, Argon2id for passwords, and PII anonymization policies.
- [x] **Part 1 Consistency**: 100% aligned with Part 1 architecture, technologies, and workflow decisions.

---

> [!IMPORTANT]
> **Part 2 Sign-Off Ready**: The database design and schema architecture are complete, fully cross-referenced, and ready for development.
> In accordance with instructions, work is now paused awaiting user review and approval before starting **Part 3: Backend Foundation and Project Setup**.

