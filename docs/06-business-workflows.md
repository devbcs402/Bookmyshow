# 06. Core Business Workflows & Sequence Specifications

This document outlines the 12 mission-critical business workflows across the platform, complete with architectural sequence diagrams, state transitions, validation checkpoints, and failure recovery policies.

---

## Workflow A: Customer Registration & Multi-Factor Login

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant W as Customer Web App
    participant API as Auth API Gateway
    participant DB as MongoDB (users)
    participant Redis as Redis (Token / OTP Cache)
    participant Email as Email / SMS Service

    alt Registration Flow
        C->>W: Enter Name, Email, Phone, Password
        W->>API: POST /api/v1/auth/register
        API->>DB: Check if Email/Phone exists
        API->>API: Hash Password with Argon2id
        API->>DB: Insert User (is_active: true, is_email_verified: false)
        API->>Redis: Store 6-digit OTP (TTL: 5m)
        API->>Email: Dispatch Verification Link / OTP
        API-->>W: 201 Created (Prompt OTP Verification)
        C->>W: Submits OTP
        W->>API: POST /api/v1/auth/verify-email
        API->>Redis: Validate OTP matches
        API->>DB: Update is_email_verified: true
        API-->>W: Email Verified Successfully
    else Login Flow
        C->>W: Enter Credentials (Email + Password)
        W->>API: POST /api/v1/auth/login
        API->>DB: Query User by Email
        API->>API: Verify Password Hash
        API->>API: Issue Access Token (JWT 15m) + Refresh Token (UUID 7d)
        API->>DB: Persist Refresh Token Hash in refresh_tokens
        API-->>W: Set-Cookie: refreshToken (HttpOnly, Secure, SameSite=Strict)<br/>Response Body: { accessToken, userProfile }
        W-->>C: Redirect to Dashboard / Active City View
    end
```

---

## Workflow B: Theatre Owner Onboarding & Super Admin Approval

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Theatre Owner
    actor Admin as Super Admin
    participant Portal as Partner Portal
    participant API as Backend Platform
    participant Cloud as Cloudinary
    participant DB as MongoDB

    Owner->>Portal: Fills Corporate & Bank Info, Uploads GST/PAN docs
    Portal->>Cloud: Direct Upload KYC PDFs (Signed Request)
    Cloud-->>Portal: Returns secure Document URLs
    Portal->>API: POST /api/v1/partners/onboard { businessName, gstin, kycDocuments }
    API->>DB: Create theatre_partners (kyc_status: "PENDING")
    API-->>Portal: 201 Created (Application Under Review)

    Admin->>API: GET /api/v1/admin/partners/pending-kyc
    API-->>Admin: List of pending partner profiles
    Admin->>API: Inspects uploaded GST / PAN certificates
    
    alt Approved
        Admin->>API: POST /api/v1/admin/partners/:partnerId/approve
        API->>DB: Update theatre_partners kyc_status: "VERIFIED"
        API->>DB: Update user role to THEATRE_OWNER
        API-->>Owner: Email Alert: "Account Approved. You may now create cinemas."
    else Rejected
        Admin->>API: POST /api/v1/admin/partners/:partnerId/reject { reason: "Invalid GST" }
        API->>DB: Update theatre_partners kyc_status: "REJECTED"
        API-->>Owner: Email Alert with rejection reason & re-upload link
    end
```

---

## Workflow C: Adding a Theatre & Screens

```mermaid
sequenceDiagram
    autonumber
    actor Partner as Theatre Partner
    participant Web as Theatre Dashboard
    participant API as Backend API
    participant DB as MongoDB

    Partner->>Web: Input Cinema Name, City, Coordinates, Address, Amenities
    Web->>API: POST /api/v1/theatres { name, cityId, location, amenities }
    API->>API: Verify Partner KYC is "VERIFIED"
    API->>DB: Insert into theatres (is_active: true)
    API-->>Web: Theatre Created Successfully (Returns theatre_id)

    Partner->>Web: Adds Screen (e.g. "Screen 1 - Dolby Atmos")
    Web->>API: POST /api/v1/theatres/:theatreId/screens { name, soundSystem, supportedFormats }
    API->>API: Verify caller owns target theatreId
    API->>DB: Check uniqueness of screen name in cinema
    API->>DB: Insert into screens
    API-->>Web: Screen Created (Ready for seating layout configuration)
```

---

## Workflow D: Configuring Visual Seating Layouts

```mermaid
sequenceDiagram
    autonumber
    actor Partner as Theatre Partner / Manager
    participant GridUI as Seating Grid Designer (UI)
    participant API as Backend API
    participant DB as MongoDB

    Partner->>GridUI: Sets Grid Matrix: 15 Rows x 20 Columns
    Partner->>GridUI: Paints Category Tiers (Rows A-C: VIP, Rows D-L: PREMIUM, M-O: STANDARD)
    Partner->>GridUI: Marks Aisle Gaps and Wheelchair slots
    Partner->>GridUI: Clicks "Save Seating Layout"
    GridUI->>API: PUT /api/v1/theatres/:theatreId/screens/:screenId/layout { seats: [...] }
    API->>API: Validate no scheduled future shows exist on this screen
    API->>DB: Bulk Upsert/Replace into seats collection for screenId
    API->>DB: Update screen total_seats, total_rows, total_columns
    API-->>GridUI: Seating Layout Saved & Validated
```

---

## Workflow E: Adding Movies & Creating Shows

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    actor Partner as Theatre Manager
    participant API as Backend API
    participant DB as MongoDB
    participant Redis as Redis Cache

    Note over Admin,DB: 1. Admin Publishes Master Movie
    Admin->>API: POST /api/v1/admin/movies { title, runtime: 150, formats, languages, cast, posters }
    API->>DB: Insert into movies (status: "NOW_SHOWING")
    API->>Redis: Invalidate movie catalog caches

    Note over Partner,DB: 2. Partner Schedules Show
    Partner->>API: POST /api/v1/shows { movieId, screenId, startTime, pricingTiers }
    API->>DB: Fetch movie runtime (150m) + calculate buffer (20m)
    API->>API: Check for overlapping shows on screenId (start < existing.end AND end > existing.start)
    alt Overlap Detected
        API-->>Partner: 409 Conflict: "Screen is occupied by another show during this time"
    else Slot Free
        API->>DB: Insert into shows (status: "BOOKING_OPEN")
        API->>DB: Clone master screen seats into initial show_seats (status: "AVAILABLE")
        API->>Redis: Evict city showtime cache
        API-->>Partner: 201 Created (Show is live for customer booking)
    end
```

---

## Workflow F: Customer Movie Discovery, Search & Dynamic Filtering

```mermaid
flowchart TD
    Start([Customer Opens App]) --> CityPrompt{City Selected?}
    CityPrompt -->|No| DetectGeo[Auto-detect GPS / Prompt City Selection Modal]
    DetectGeo --> SaveCity[Persist Selected City in LocalStorage & Context]
    CityPrompt -->|Yes| FetchCatalog[Fetch Active Catalog for City]

    SaveCity --> FetchCatalog
    FetchCatalog --> CheckRedis{Is Cached in Redis?}
    CheckRedis -->|Yes| ReturnCache[Return Cached Movies Response < 20ms]
    CheckRedis -->|No| QueryDB[Query MongoDB: status=NOW_SHOWING, city_id=activeCity]
    QueryDB --> PopulateRedis[Cache Response in Redis TTL: 10m]
    PopulateRedis --> ReturnCache

    ReturnCache --> FilterUser{User Applies Filters?}
    FilterUser -->|Language / Format / Genre| ClientFilter[Instant TanStack Query Filter or Sub-Query]
    FilterUser -->|Search Text| DebounceSearch[Debounced Search Query: title, actor, director]
    ClientFilter --> RenderUI[Render Movie Cards with Poster, Rating & Next Available Showtime]
    DebounceSearch --> RenderUI
```

---

## Workflow G: Theatre & Showtime Selection with City Context

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Web as Customer Web App
    participant API as Backend API
    participant DB as MongoDB

    Customer->>Web: Selects Movie "Inception" & Date "Tomorrow"
    Web->>API: GET /api/v1/shows?movieId=...&cityId=...&date=2026-11-01
    API->>DB: Aggregate shows matching city, movie, date range
    API->>DB: Group by Theatre complex -> Screens -> Showtimes
    API-->>Web: Array of Theatres with available formats & showtime pills
    Note over Web: Showtimes displayed with availability hints: Green (>50%), Amber (<20%), Red (Sold Out)
    Customer->>Web: Clicks 7:30 PM Show pill
    Web->>Web: Transitions to /booking/show/:showId/seats
```

---

## Workflow H: Seat Selection & Distributed Temporary Locking

```mermaid
sequenceDiagram
    autonumber
    actor C1 as Customer 1
    actor C2 as Customer 2
    participant Web1 as Web Client 1
    participant Web2 as Web Client 2
    participant API as API Server
    participant Redis as Redis Lock Engine
    participant Socket as Socket.IO Broker

    Web1->>Socket: join_show_room("show_99")
    Web2->>Socket: join_show_room("show_99")
    
    Note over C1,C2: Both C1 and C2 attempt to select Seat J10 simultaneously
    C1->>API: POST /api/v1/shows/show_99/lock-seats { seatIds: ["J10"] }
    C2->>API: POST /api/v1/shows/show_99/lock-seats { seatIds: ["J10"] }

    API->>Redis: Execute Atomic Lua Lock Script for C1
    Redis-->>API: Acquired OK (TTL: 600s / 10m)
    API->>Socket: Broadcast "SEATS_LOCKED" { seatIds: ["J10"], lockedBy: C1_Id }
    API-->>Web1: 200 OK (Seats locked. 10:00 Countdown Timer Begins)

    API->>Redis: Execute Atomic Lua Lock Script for C2
    Redis-->>API: ERR_SEAT_ALREADY_LOCKED
    API-->>Web2: 409 Conflict: "One or more selected seats are no longer available"
    
    Socket-->>Web2: Real-time update: Seat J10 becomes Grey (Locked)
```

---

## Workflow I: Payment Processing (Razorpay Integration)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Web as Web Client
    participant API as Backend Server
    participant Redis as Redis Lock Store
    participant DB as MongoDB
    participant Razorpay as Razorpay API

    Web->>API: POST /api/v1/bookings/initiate { showId, seatIds, couponCode }
    API->>Redis: Validate customer owns active locks for all seatIds
    API->>API: Calculate Pricing: Base + Convenience Fee + GST - Discount
    API->>DB: Insert bookings (status: "PENDING_PAYMENT")
    API->>Razorpay: POST /orders { amount, currency: "INR", receipt: bookingId }
    Razorpay-->>API: Returns { id: "order_K7x9812", amount }
    API->>DB: Insert payments (razorpay_order_id, status: "CREATED")
    API-->>Web: Return { bookingId, razorpayOrderId, keyId, amount }

    Web->>Customer: Opens Razorpay Native Checkout Modal
    Customer->>Razorpay: Authorizes Payment via UPI / Card / NetBanking
    Razorpay-->>Web: Success Callback { razorpay_payment_id, razorpay_signature }
```

---

## Workflow J: Booking Confirmation & ACID Ledger Commit

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant Web as Web App
    participant API as Backend API
    participant DB as MongoDB Replica Set
    participant Redis as Redis
    participant Queue as BullMQ Worker Queue

    Web->>API: POST /api/v1/payments/verify { bookingId, razorpay_payment_id, razorpay_signature }
    API->>API: Cryptographic Verification (HMAC-SHA256 signature check)
    
    rect rgb(240, 248, 255)
        Note over API,DB: MongoDB ACID Multi-Document Transaction
        API->>DB: Session.startTransaction()
        API->>DB: Update bookings (status: "CONFIRMED", checked_in: false)
        API->>DB: Update payments (status: "CAPTURED", payment_id)
        API->>DB: Update show_seats (status: "BOOKED", booking_id)
        API->>DB: Decrement shows.available_seats_count
        API->>DB: Session.commitTransaction()
    end

    API->>Redis: Remove temporary Redis locks for seatIds
    API->>Queue: Enqueue ticketQueue.add("ISSUE_TICKET", { bookingId })
    API-->>Web: 200 OK { bookingReference, ticketStatus: "CONFIRMED" }
    Web-->>Customer: Display Booking Success Screen with Seat Numbers
```

---

## Workflow K: QR Ticket Generation & Box-Office Gate Verification

```mermaid
sequenceDiagram
    autonumber
    participant Queue as BullMQ Worker
    participant DB as MongoDB
    participant Cloud as Cloudinary
    participant Staff as Theatre Staff Scanner
    participant API as Staff API

    Note over Queue,Cloud: Asynchronous Ticket PDF & QR Generation
    Queue->>DB: Fetch confirmed booking details & show metadata
    Queue->>Queue: Generate HMAC Encrypted QR Code Payload: { bookingRef, showId, hash }
    Queue->>Queue: Render Ticket PDF with QR Code using PDFKit
    Queue->>Cloud: Upload PDF to Cloudinary (/tickets/2026/...)
    Cloud-->>Queue: Returns secure PDF download URL
    Queue->>DB: Update bookings.pdf_ticket_url & qr_code_payload
    Queue->>Queue: Trigger Email & WhatsApp with PDF Ticket

    Note over Staff,API: Gatekeeper Admittance Verification
    Staff->>Staff: Points Camera at Customer's Phone Screen
    Staff->>API: POST /api/v1/tickets/verify { qrPayload }
    API->>API: Validate Cryptographic HMAC Signature
    API->>DB: Fetch Booking by Reference
    
    alt Ticket Valid & Not Checked In
        API->>DB: Update booking is_checked_in: true, checked_in_at: Date.now, staff_id
        API-->>Staff: Sound Beep GREEN: "Valid Ticket. Admitted: 2 Seats (J10, J11)"
    else Ticket Already Scanned
        API-->>Staff: Sound Beep RED: "ALREADY CHECKED IN at 7:15 PM!"
    else Invalid / Cancelled Ticket
        API-->>Staff: Sound Beep RED: "INVALID TICKET / CANCELLED"
    end
```

---

## Workflow L: Booking Cancellation, Inventory Restitution & Refunds

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant API as Backend Platform
    participant DB as MongoDB
    participant Razorpay as Razorpay API
    participant Socket as Socket.IO Broker

    Customer->>API: POST /api/v1/bookings/:bookingId/cancel { reason }
    API->>DB: Fetch booking & associated show start_time
    
    API->>API: Calculate Refund Window
    Note over API: Show Time - Current Time = Delta<br/>Delta > 24h: 100% Ticket Refund<br/>2h < Delta <= 24h: 50% Ticket Refund<br/>Delta <= 2h: 400 Bad Request (Non-Cancellable)

    rect rgb(255, 240, 245)
        Note over API,DB: MongoDB Cancellation Transaction
        API->>DB: Update bookings status: "CANCELLED"
        API->>DB: Update show_seats status: "AVAILABLE", booking_id: null
        API->>DB: Increment shows.available_seats_count
        API->>DB: Insert refunds record (status: "PENDING", refund_amount)
    end

    API->>Razorpay: POST /payments/:paymentId/refund { amount: refund_amount }
    Razorpay-->>API: Returns { id: "rfnd_890", status: "processed" }
    API->>DB: Update refunds (status: "SUCCESS", razorpay_refund_id)
    API->>Socket: Broadcast "SEATS_AVAILABLE" { showId, seatIds }
    API-->>Customer: 200 OK: "Booking Cancelled. Refund of ₹X will reflect in 3-5 days."
```

