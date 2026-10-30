# 10. Coupons, Promotions & Redemption Ledger Schema Specification

## 1. Subsystem Architecture & Abuse Prevention

The Promotional Subsystem handles discount campaigns, corporate bank offers (e.g. "Buy 1 Get 1 on ICICI Cards"), and referral coupons. 

### Abuse Vectors & Mitigations
1. **Concurrency Redemptions (Double Spending)**:
   - A customer opens two browser tabs and applies a single-use coupon (`limitPerUser: 1`) on both checkouts simultaneously.
   - *Mitigation*: Application checks count in `coupon_redemptions` within the MongoDB booking commit transaction. A compound unique index on `{ couponId: 1, customerId: 1 }` (for single-use coupons) or a conditional atomic increment on `coupons.currentUsageCount` guarantees that a coupon can never exceed its budget or per-user cap.
2. **Post-Cancellation Re-use**:
   - If a booking is cancelled, the redemption record is flagged as `REVOKED`, restoring the customer's eligibility to use the coupon code on a future purchase.

---

## 2. Collection Schemas

### 2.1 Collection: `coupons`

#### A. Purpose
Stores promotional voucher definitions, discount rules, eligibility criteria, and budgetary limits.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `code` | `String` | Yes | - | UpperCase, alphanumeric regex, unique | Promotional promo code |
| `title` | `String` | Yes | - | Trim, max: 100 | Display title |
| `description` | `String` | Yes | - | Trim, max: 500 | Terms and conditions summary |
| `discountType` | `String` | Yes | `PERCENTAGE` | Enum: `PERCENTAGE`, `FLAT` | Discount calculation model |
| `discountValue` | `Number` | Yes | - | Positive currency or percentage (1-100) | Value of discount |
| `maxDiscountCap`| `Number` | No | `null` | Positive currency amount | Maximum discount ceiling for percentage offers |
| `minOrderValue` | `Number` | Yes | `0.0` | Non-negative currency amount | Minimum booking threshold |
| `usageLimitPerUser`| `Number`| Yes | `1` | Positive integer | Maximum times a single user can redeem |
| `totalUsageLimit`| `Number`| No | `null` | Positive integer | Universal platform-wide redemption budget |
| `currentUsageCount`| `Number`| Yes | `0` | Non-negative integer | Live redemption counter |
| `applicableCities`| `[ObjectId]`| No | `[]` | Refs: `cities` (Empty = valid in all cities) | City geo-fencing |
| `applicableTheatres`| `[ObjectId]`| No| `[]` | Refs: `theatres` (Empty = all cinemas) | Partner/theatre fencing |
| `applicableMovies`| `[ObjectId]`| No | `[]` | Refs: `movies` (Empty = all movies) | Title fencing |
| `startDate` | `Date` | Yes | - | ISO Date | Campaign start |
| `endDate` | `Date` | Yes | - | ISO Date (Must be > `startDate`) | Campaign expiration |
| `isActive` | `Boolean` | Yes | `true` | Boolean | Administrative toggle |
| `deletedAt` | `Date` | No | `null` | ISO Date | Soft delete marker |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Unique**: `{ code: 1 }`.
- **Validation Index**: `{ code: 1, isActive: 1, startDate: 1, endDate: 1 }` (High-speed coupon checkout lookup).

---

### 2.2 Collection: `coupon_redemptions`

#### A. Purpose
Immutable ledger recording each redemption of a coupon by a customer on a specific booking.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `couponId` | `ObjectId` | Yes | - | Ref: `coupons` | Applied coupon |
| `couponCode` | `String` | Yes | - | Denormalized uppercase string | Coupon code |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Redeeming customer |
| `bookingId` | `ObjectId` | Yes | - | Ref: `bookings` | Beneficiary booking |
| `discountAmount`| `Number` | Yes | - | Positive currency amount | Discount value granted |
| `status` | `String` | Yes | `COMMITTED` | Enum: `COMMITTED`, `REVOKED` | Redemption status |
| `redeemedAt` | `Date` | Yes | Auto | ISO Date | Timestamp of redemption |

#### C. Unique Constraints & Indexes
- **Compound Audit Index**: `{ couponId: 1, customerId: 1, status: 1 }` (Evaluates per-user usage limit).
- **Booking Link Index**: `{ bookingId: 1 }`.

#### D. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f9f01" },
  "couponId": { "$oid": "67220b3f81e7d23a104f9e01" },
  "couponCode": "BLOCKBUSTER100",
  "customerId": { "$oid": "67220b3f81e7d23a104f9810" },
  "bookingId": { "$oid": "67220b3f81e7d23a104f9c01" },
  "discountAmount": 100.0,
  "status": "COMMITTED",
  "redeemedAt": { "$date": "2026-10-30T10:32:15.000Z" }
}
```

