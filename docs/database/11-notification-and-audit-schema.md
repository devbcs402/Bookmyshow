# 11. Customer Engagement, Platform Governance & Audit Schema Specification

## 1. Subsystem Overview

This subsystem handles customer re-engagement (movie watchlists and in-app notifications), system-wide operational governance (`platform_settings`), and regulatory compliance auditing (`audit_logs`).

---

## 2. Collection Schemas

### 2.1 Collection: `wishlists`

#### A. Purpose
Tracks movies bookmarked by retail customers. Powers automated notification triggers when ticket bookings officially open in the user's city.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Bookmarking user |
| `movieId` | `ObjectId` | Yes | - | Ref: `movies` | Bookmarked title |
| `cityId` | `ObjectId` | Yes | - | Ref: `cities` | Context city for release alerts |
| `notifyOnBookingOpen`| `Boolean`| Yes | `true` | Boolean | Customer alert preference |
| `isAlertDispatched` | `Boolean`| Yes | `false` | Boolean | True once alert has been sent |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Compound Unique**: `{ customerId: 1, movieId: 1 }` (Strictly one bookmark entry per movie per customer).
- **Notification Trigger Index**: `{ movieId: 1, cityId: 1, notifyOnBookingOpen: 1, isAlertDispatched: 1 }` (Enables instant broadcast sweep when a show is published).

---

### 2.2 Collection: `notifications`

#### A. Purpose
Stores in-app customer notifications, booking alerts, show cancellations, and promotional dispatches.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `userId` | `ObjectId` | Yes | - | Ref: `users` | Recipient user |
| `type` | `String` | Yes | - | Enum: `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `TICKET_ALERT`, `REFUND_PROCESSED`, `PROMOTIONAL` | Notification category |
| `title` | `String` | Yes | - | Trim, max: 120 | Alert headline |
| `message` | `String` | Yes | - | Trim, max: 1000 | Formatted message body |
| `metadata` | `Object` | No | `{}` | Key-value mapping | E.g. `{ bookingId: "...", url: "/tickets/..." }` |
| `isRead` | `Boolean` | Yes | `false` | Boolean | Read status indicator |
| `readAt` | `Date` | No | `null` | ISO Date | Timestamp when opened by user |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Timestamp |

#### C. Unique Constraints & Indexes
- **Customer Feed Index**: `{ userId: 1, isRead: 1, createdAt: -1 }` (Powers the notification bell dropdown).
- **TTL Index**: `{ createdAt: 1 }` (Auto-purges old notifications after 60 days).

---

### 2.3 Collection: `audit_logs`

#### A. Purpose
Immutable, write-once audit log capturing all administrative and sensitive operations (theatre KYC approval, show cancellations, price overrides, role assignments, manual refunds) for regulatory compliance and security forensics.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `actorId` | `ObjectId` | Yes | - | Ref: `users` | Admin or partner performing the mutation |
| `actorRole` | `String` | Yes | - | E.g. `SUPER_ADMIN`, `THEATRE_OWNER` | Role at time of action |
| `partnerId` | `ObjectId` | No | `null` | Ref: `theatre_partners` | Tenant scope (if applicable) |
| `action` | `String` | Yes | - | UpperCase string (e.g. `SHOW_PRICING_UPDATED`) | Action identifier |
| `targetResource`| `String` | Yes | - | E.g. `shows`, `theatre_partners`, `refunds` | Affected collection |
| `targetId` | `ObjectId` | Yes | - | ObjectId | Affected document ID |
| `ipAddress` | `String` | Yes | - | IPv4 / IPv6 string | Originating client IP |
| `userAgent` | `String` | No | `""` | Browser user-agent string | Device header |
| `previousState` | `Object` | No | `null` | JSON snapshot | State prior to modification |
| `newState` | `Object` | No | `null` | JSON snapshot | State following modification |
| `timestamp` | `Date` | Yes | Auto | ISO Date | Exact event timestamp |

#### C. Unique Constraints & Indexes
- **Resource Audit History Index**: `{ targetResource: 1, targetId: 1, timestamp: -1 }`.
- **Actor Timeline Index**: `{ actorId: 1, timestamp: -1 }`.
- **Tenant Audit Index**: `{ partnerId: 1, timestamp: -1 }`.
- **Append-Only Policy**: Deletion or update of documents in `audit_logs` is strictly prohibited at the application and database user permission levels.

---

### 2.4 Collection: `platform_settings`

#### A. Purpose
Singleton document storing universal business rules, GST tax rates, default convenience fees, lock timeouts, and commission schedules.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key |
| `key` | `String` | Yes | `GLOBAL_CONFIG` | Unique configuration key |
| `seatLockTtlSeconds` | `Number` | Yes | `600` | Redis hold duration (10 mins) |
| `maxSeatsPerBooking` | `Number` | Yes | `10` | Hard cap per transaction |
| `defaultConvenienceFeePerTicket` | `Number` | Yes | `30.0` | Default service fee in INR |
| `taxPercent` | `Number` | Yes | `18.0` | Goods & Services Tax (GST) rate |
| `cancellationPolicies` | `[SubDoc]` | Yes | - | Dynamic refund window thresholds |
| `supportContact` | `SubDoc` | Yes | - | Support email, hotline, operating hours |
| `updatedBy` | `ObjectId` | Yes | - | Ref: `users` (Super Admin) |
| `updatedAt` | `Date` | Yes | Auto | Timestamp |

#### Sub-Document: `cancellationPolicies`
```typescript
[
  { hoursBeforeShow: 24, refundPercentage: 100, isFeeRefundable: false },
  { hoursBeforeShow: 2,  refundPercentage: 50,  isFeeRefundable: false },
  { hoursBeforeShow: 0,  refundPercentage: 0,   isFeeRefundable: false }
]
```

#### C. Unique Constraints & Indexes
- **Unique**: `{ key: 1 }`.

