# 08. Booking Management Subsystem Schema Specification

## 1. Architectural Analysis: Embedded vs. Separated `booking_seats`

A foundational architectural decision in ticket booking schema design is whether to store individual reserved seats as an embedded array within `bookings` or as an independent normalized `booking_seats` collection.

### Comprehensive Comparison Matrix

| Architectural Evaluation Criteria | Approach A: Normalized `booking_seats` Collection | Approach B: Embedded `seats` in `bookings` (CHOSEN) |
| :--- | :--- | :--- |
| **Read Performance (Customer Ticket)** | High latency: Requires `$lookup` join or secondary query to assemble ticket line items. | Sub-millisecond latency: Entire ticket, QR code, and seats fetched in a single document read. |
| **Write Atomicity & Transactions** | Higher write amplification: Requires multi-document insert across `bookings` and $N$ rows in `booking_seats`. | Single document insert: Atomic write within the parent booking transaction. |
| **Document Size & BSON Limits** | Negligible savings: Bookings have a hard ceiling of 10 seats per transaction (< 4KB payload). | Perfectly bounds within MongoDB's 16MB document limit (< 0.1% of max size). |
| **Audit & Point-in-Time Snapshotting**| Complex: Updating relations risks mutating historical reporting. | Ideal: Denormalized snapshot guarantees the ticket remains historically accurate forever. |
| **Analytical Querying Across Seats** | Straightforward `group-by` queries on seat categories. | Easily accomplished using MongoDB Aggregation `$unwind` on `$bookings.seats`. |

### Architectural Decision: Hybrid Snapshotting Model
- **Embedded Array (`bookings.seats`)**: Stores the final, immutable customer line-item breakdown (Seat Label, Category, Unit Price) directly within the booking document for zero-join retrieval.
- **Dedicated Operational Collection (`show_seats`)**: Enforces atomic locking, unique constraints, and real-time inventory management at the database level.
- **Embedded State Audit (`bookings.statusHistory`)**: Tracks lifecycle transitions (`PENDING_PAYMENT` -> `CONFIRMED` -> `CANCELLED`) with actor ID, timestamp, and metadata directly inside the booking for full observability without a separate join.

---

## 2. Collection Schemas

### 2.1 Collection: `bookings`

#### A. Purpose
Primary financial and fulfillment contract document. Stores immutable snapshots of show metadata, customer details, reserved seats, tax calculations, QR codes, and cancellation parameters.

#### B. Field Specifications
| Field Name | Data Type | Required | Default | Validation & Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | BSON ObjectId | Primary Key |
| `bookingReference` | `String` | Yes | - | UpperCase alphanumeric (e.g. `BMS-202611-X89K2`) | Unique customer-facing reference code |
| `customerId` | `ObjectId` | Yes | - | Ref: `users` | Purchasing customer |
| `partnerId` | `ObjectId` | Yes | - | Ref: `theatre_partners` | Denormalized tenant ID for partner box office reports |
| `theatreId` | `ObjectId` | Yes | - | Ref: `theatres` | Cinema property |
| `screenId` | `ObjectId` | Yes | - | Ref: `screens` | Auditorium |
| `showId` | `ObjectId` | Yes | - | Ref: `shows` | Specific screening |
| `movieId` | `ObjectId` | Yes | - | Ref: `movies` | Screened film |
| `seats` | `[SubDoc]` | Yes | - | Min 1, Max 10 items | Array of reserved seat line items |
| `totalSeats` | `Number` | Yes | - | Integer, 1 to 10 | Total ticket count |
| `baseAmount` | `Number` | Yes | - | Positive currency amount | Sum of seat base prices |
| `convenienceFee`| `Number` | Yes | `0.0` | Positive currency amount | Platform service fee |
| `taxAmount` | `Number` | Yes | `0.0` | Positive currency amount | Calculated GST (18%) |
| `discountAmount`| `Number` | Yes | `0.0` | Non-negative currency amount | Discount deducted via coupon |
| `netPayableAmount`| `Number`| Yes | - | Must equal `base + fee + tax - discount` | Final charged amount |
| `couponId` | `ObjectId` | No | `null` | Ref: `coupons` | Applied promotional coupon |
| `couponCode` | `String` | No | `""` | UpperCase | Denormalized coupon code |
| `status` | `String` | Yes | `PENDING_PAYMENT` | Enum: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `REFUNDED`, `EXPIRED`, `FAILED` | Booking lifecycle status |
| `snapshot` | `SubDoc` | Yes | - | Denormalized snapshot object | Point-in-time show and cinema metadata |
| `qrCodePayload` | `String` | No | `""` | Cryptographically signed HMAC string | Admittance payload scanned at gate |
| `pdfTicketUrl` | `String` | No | `""` | Valid Cloudinary URL | Rendered PDF ticket download link |
| `isCheckedIn` | `Boolean` | Yes | `false` | Boolean | Gate admittance flag |
| `checkedInAt` | `Date` | No | `null` | ISO Date | Timestamp of entry scanning |
| `checkedInBy` | `ObjectId` | No | `null` | Ref: `users` (Staff ID) | Admitting usher |
| `cancellation` | `SubDoc` | No | `null` | Cancellation details object | Present if booking is cancelled |
| `statusHistory` | `[SubDoc]` | Yes | `[]` | Array of audit events | Full timestamped lifecycle audit trail |
| `createdAt` | `Date` | Yes | Auto | ISO Date | Booking creation timestamp |
| `updatedAt` | `Date` | Yes | Auto | ISO Date | Last update timestamp |

#### Sub-Document: `seats` Line Items
```typescript
{
  seatId: ObjectId,       // Ref: seats
  seatLabel: String,      // E.g. "F12"
  rowLabel: String,       // E.g. "F"
  columnNumber: Number,   // E.g. 12
  categoryCode: String,   // E.g. "PREMIUM"
  categoryName: String,   // E.g. "Prime Plus"
  unitPrice: Number       // E.g. 400.00
}
```

#### Sub-Document: `snapshot` (Immutable Historical Record)
```typescript
{
  movieTitle: String,         // "Interstellar"
  moviePosterUrl: String,     // Cloudinary URL
  censorRating: String,       // "UA_13_PLUS"
  durationMins: Number,       // 169
  format: String,             // "IMAX_3D"
  language: String,           // "English"
  theatreName: String,        // "PVR ICON: Phoenix Palladium"
  theatreAddress: String,     // "Lower Parel West, Mumbai"
  screenName: String,         // "Audi 1 - IMAX Laser"
  showStartTime: Date,        // 2026-11-06T19:30:00.000Z
  seatSummary: String         // "F12, F13 (Prime Plus)"
}
```

#### Sub-Document: `cancellation`
```typescript
{
  cancelledAt: Date,
  reason: String,
  initiatedBy: ObjectId,     // Ref: users
  refundPercentage: Number,  // E.g., 100, 50, 0
  refundAmount: Number,      // Base ticket refund
  nonRefundableFee: Number   // Convenience fee retained by platform
}
```

#### Sub-Document: `statusHistory`
```typescript
{
  status: String,         // E.g., "CONFIRMED"
  timestamp: Date,        // Date.now
  actorId: ObjectId,      // System or User ID
  notes: String           // E.g., "Payment captured via Razorpay webhook"
}
```

#### C. Unique Constraints & Indexes
- **Unique**: `{ bookingReference: 1 }`.
- **Customer Booking History Index**: `{ customerId: 1, createdAt: -1 }` (Primary customer account view).
- **Show Settlement & Box Office Index**: `{ showId: 1, status: 1 }`.
- **Partner Tenant Reporting Index**: `{ partnerId: 1, createdAt: -1 }`.
- **Reconciliation Sweep Index**: `{ status: 1, createdAt: 1 }` (Detects zombie `PENDING_PAYMENT` records).

#### D. Example JSON Document
```json
{
  "_id": { "$oid": "67220b3f81e7d23a104f9c01" },
  "bookingReference": "BMS-202611-F89A1",
  "customerId": { "$oid": "67220b3f81e7d23a104f9810" },
  "partnerId": { "$oid": "67220b3f81e7d23a104f9901" },
  "theatreId": { "$oid": "67220b3f81e7d23a104f9911" },
  "screenId": { "$oid": "67220b3f81e7d23a104f9951" },
  "showId": { "$oid": "67220b3f81e7d23a104f9b01" },
  "movieId": { "$oid": "67220b3f81e7d23a104f981a" },
  "seats": [
    {
      "seatId": { "$oid": "67220b3f81e7d23a104f9a50" },
      "seatLabel": "A1",
      "rowLabel": "A",
      "columnNumber": 1,
      "categoryCode": "RECLINER",
      "categoryName": "Royal Recliner",
      "unitPrice": 650.0
    },
    {
      "seatId": { "$oid": "67220b3f81e7d23a104f9a51" },
      "seatLabel": "A2",
      "rowLabel": "A",
      "columnNumber": 2,
      "categoryCode": "RECLINER",
      "categoryName": "Royal Recliner",
      "unitPrice": 650.0
    }
  ],
  "totalSeats": 2,
  "baseAmount": 1300.0,
  "convenienceFee": 60.0,
  "taxAmount": 10.8,
  "discountAmount": 100.0,
  "netPayableAmount": 1270.8,
  "couponId": { "$oid": "67220b3f81e7d23a104f9e01" },
  "couponCode": "BLOCKBUSTER100",
  "status": "CONFIRMED",
  "snapshot": {
    "movieTitle": "Interstellar",
    "moviePosterUrl": "https://res.cloudinary.com/bms/image/upload/v1/movies/interstellar-poster.jpg",
    "censorRating": "UA_13_PLUS",
    "durationMins": 169,
    "format": "IMAX_3D",
    "language": "English",
    "theatreName": "PVR ICON: Phoenix Palladium, Lower Parel",
    "theatreAddress": "462, Senapati Bapat Marg, Lower Parel West, Mumbai",
    "screenName": "Audi 1 - IMAX Laser",
    "showStartTime": { "$date": "2026-11-06T19:30:00.000Z" },
    "seatSummary": "A1, A2 (Royal Recliner)"
  },
  "qrCodePayload": "v1.bms.67220b3f81e7d23a104f9c01.1793448000.9f83a0e1c2b5",
  "pdfTicketUrl": "https://res.cloudinary.com/bms/raw/upload/v1/tickets/BMS-202611-F89A1.pdf",
  "isCheckedIn": false,
  "checkedInAt": null,
  "checkedInBy": null,
  "cancellation": null,
  "statusHistory": [
    { "status": "PENDING_PAYMENT", "timestamp": { "$date": "2026-10-30T10:30:00.000Z" }, "notes": "Initiated checkout" },
    { "status": "CONFIRMED", "timestamp": { "$date": "2026-10-30T10:32:15.000Z" }, "notes": "Payment verified via Razorpay webhook" }
  ],
  "createdAt": { "$date": "2026-10-30T10:30:00.000Z" },
  "updatedAt": { "$date": "2026-10-30T10:32:15.000Z" }
}
```

