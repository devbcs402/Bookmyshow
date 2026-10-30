# 12. Entity Relationship Diagrams & Data Association Models

## 1. Subsystem Domain Entity Relationship Model

This document maps all database entity associations, foreign-key relationships, cardinality, and referential integrity constraints across the 24 operational collections.

```mermaid
erDiagram
    users ||--o{ refresh_tokens : "owns active sessions"
    users ||--o{ otp_verifications : "receives OTPs"
    roles ||--o{ users : "assigned to"
    roles ||--o{ role_permissions : "contains"
    permissions ||--o{ role_permissions : "granted to"

    countries ||--o{ states : "subdivides"
    states ||--o{ cities : "contains"
    cities ||--o{ theatres : "hosts cinemas"

    theatre_partners ||--o{ theatres : "operates branches"
    theatre_partners ||--o{ users : "employs staff"
    theatres ||--o{ screens : "houses"
    screens ||--o{ seats : "configures"

    movies ||--o{ shows : "scheduled as"
    movies }o--o{ genres : "categorized by"
    movies }o--o{ languages : "dubbed in"
    movies ||--o{ movie_reviews : "receives"
    users ||--o{ movie_reviews : "authors"

    screens ||--o{ shows : "hosts"
    shows ||--o{ show_seats : "allocates inventory"
    seats ||--o{ show_seats : "instantiated as"

    users ||--o{ bookings : "places orders"
    shows ||--o{ bookings : "reserves tickets for"
    bookings ||--o{ payments : "paid via"
    payments ||--o{ refunds : "reversed via"
    payment_webhooks ||--o| payments : "verifies"

    coupons ||--o{ coupon_redemptions : "redeemed via"
    bookings ||--o{ coupon_redemptions : "applies discount to"
    users ||--o{ wishlists : "bookmarks"
    movies ||--o{ wishlists : "target of"
    users ||--o{ notifications : "receives alerts"
    theatre_partners ||--o{ audit_logs : "scoped to"
```

---

## 2. Granular Subsystem Association Mappings

### 2.1 Multi-Tenant Cinema Hierarchy (1-to-Many Cascades)

```mermaid
graph TD
    TP[theatre_partners<br/>Tenant Entity] -->|1 : N| TH1[theatres: Mumbai Complex]
    TP -->|1 : N| TH2[theatres: Bengaluru Complex]
    
    TH1 -->|1 : N| SC1[screens: Screen 1 IMAX]
    TH1 -->|1 : N| SC2[screens: Screen 2 Dolby]

    SC1 -->|1 : N| SE1[seats: Master Layout V1<br/>Chairs A1...A20, B1...B20]
    SC1 -->|1 : N| SH1[shows: Show 1 - 4:00 PM]
    SC1 -->|1 : N| SH2[shows: Show 2 - 7:30 PM]

    SH1 -->|1 : N| SS1[show_seats: Show 1 Inventory<br/>Seat A1: AVAILABLE<br/>Seat A2: BOOKED]
```

### 2.2 Core Booking & Financial Settlement Chain

```mermaid
graph LR
    User[users] -->|1 : N| Booking[bookings<br/>BMS-202611-F89A1<br/>Snapshot: Interstellar, IMAX 3D]
    Show[shows] -->|1 : N| Booking
    ShowSeat[show_seats] -->|Atomic State| Booking
    
    Booking -->|1 : 1..N| Payment[payments<br/>Razorpay Order: order_K9x1<br/>Status: CAPTURED]
    Payment -->|1 : 0..1| Refund[refunds<br/>Razorpay Refund: rfnd_01<br/>Status: SUCCESS]
    Webhook[payment_webhooks<br/>Event: payment.captured] -->|Idempotent Update| Payment
```

---

## 3. Referential Integrity & Cascade Policies

Because MongoDB does not enforce declarative database-level foreign keys (like SQL `ON DELETE CASCADE`), referential integrity is strictly enforced at the **Mongoose Application Middleware & Repository Layer**:

| Parent Collection | Child Collection | Foreign Key Field | Cascade Policy on Deletion / Soft Delete | Enforced Rule |
| :--- | :--- | :--- | :--- | :--- |
| `theatre_partners` | `theatres` | `partnerId` | **RESTRICT / SOFT CASCADE** | Cannot delete partner if active theatres exist. Soft deleting partner automatically soft-deletes child theatres and disables active shows. |
| `theatres` | `screens` | `theatreId` | **RESTRICT** | Cannot delete cinema if screens are defined. |
| `screens` | `shows` | `screenId` | **RESTRICT** | Cannot delete screen if future scheduled shows exist (`startTime > NOW()`). |
| `shows` | `show_seats` | `showId` | **CASCADE (System)** | When a show is archived, associated show_seats can be archived or dropped. |
| `shows` | `bookings` | `showId` | **RESTRICT** | Cannot delete or alter show if confirmed bookings exist (`bookings.status == 'CONFIRMED'`). Requires formal show cancellation workflow with refunds. |
| `bookings` | `payments` | `bookingId` | **IMMUTABLE RESTRICT** | Bookings and payments can never be hard-deleted (statutory financial ledger requirement). |
| `movies` | `shows` | `movieId` | **RESTRICT** | Cannot delete movie if active or upcoming shows exist. |
| `users` | `bookings` | `customerId` | **ANONYMIZE ON DELETE** | If customer invokes GDPR/DPDP "Right to be Forgotten", customer profile is soft-deleted, but financial booking documents retain transaction references with personal PII redacted. |

