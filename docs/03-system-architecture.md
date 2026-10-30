# 03. End-to-End System Architecture

## 1. High-Level Enterprise System Architecture

The Movie Ticket Booking Platform is organized as a high-throughput, cloud-native **Modular Monolith**. It unifies presentation, API routing, business logic, asynchronous event pipelines, distributed state synchronization, and persistent storage into a coherent, highly maintainable ecosystem.

```mermaid
flowchart TB
    subgraph Clients ["Client Layer (Edge)"]
        CA["Customer Web App<br/>(React / Vite)"]
        TA["Theatre Partner Portal<br/>(React / Vite)"]
        AA["Admin Control Tower<br/>(React / Vite)"]
    end

    subgraph CDN_Gateway ["Ingress & Edge Services"]
        Cloudflare["Cloudflare CDN & WAF<br/>(DDoS, SSL, Static Caching)"]
        Nginx["Nginx Reverse Proxy & Load Balancer<br/>(SSL Termination, Rate Limiting)"]
    end

    subgraph Backend_Cluster ["Application Tier (Node.js Modular Monolith)"]
        Instance1["API Node Instance 1<br/>(Express Core)"]
        Instance2["API Node Instance 2<br/>(Express Core)"]
        InstanceN["API Node Instance N<br/>(Auto-scaled)"]
    end

    subgraph Realtime_Tier ["Realtime Event Broker"]
        SocketCluster["Socket.IO Server Cluster"]
        RedisAdapter["Redis Pub/Sub Adapter"]
    end

    subgraph In_Memory_Tier ["High-Speed In-Memory Tier (Redis Cluster)"]
        RedisLock["Redis Seat Locking Engine<br/>(Atomic Lua Scripts)"]
        RedisCache["Redis Response & Session Cache"]
        RedisQueue["BullMQ Job Queues<br/>(Async Tasks)"]
    end

    subgraph Data_Tier ["Persistent Database Tier (MongoDB Cluster)"]
        MongoPrimary[("MongoDB Primary Replica<br/>(ACID Writes & Transactions)")]
        MongoSecondary1[("MongoDB Secondary Replica 1<br/>(Read Preference: Secondary)")]
        MongoSecondary2[("MongoDB Secondary Replica 2<br/>(Analytics & Read Scaling)")]
    end

    subgraph External_Services ["External Infrastructure Integrations"]
        Razorpay["Razorpay Payment Gateway<br/>(Checkout & Webhooks)"]
        Cloudinary["Cloudinary Media CDN<br/>(Signed Uploads, Image Transforms)"]
        SMTP["Transactional Email / SMS<br/>(Nodemailer / Twilio / SendGrid)"]
    end

    Clients -->|HTTPS / WSS| Cloudflare
    Cloudflare --> Nginx
    Nginx --> Instance1
    Nginx --> Instance2
    Nginx --> InstanceN

    Instance1 <--> SocketCluster
    Instance2 <--> SocketCluster
    SocketCluster <--> RedisAdapter

    Instance1 <--> RedisLock
    Instance1 <--> RedisCache
    Instance1 <--> RedisQueue

    Instance1 --> MongoPrimary
    Instance2 --> MongoPrimary
    Instance1 -.->|Read-heavy queries| MongoSecondary1

    Instance1 <--> Razorpay
    Instance1 <--> Cloudinary
    RedisQueue --> SMTP
```

---

## 2. Frontend Architecture (React.js SPA)

Each of the three applications (`customer-web`, `theatre-dashboard`, `admin-dashboard`) follows a clean, feature-driven architecture.

```mermaid
graph TD
    subgraph UI_Layer ["Presentation & Routing Layer"]
        Router["React Router v6<br/>(Route Guards & Lazy Code Splitting)"]
        Views["Page Views & Layouts"]
        Components["Atomic Design UI Components<br/>(Tailwind CSS)"]
    end

    subgraph State_Management ["State Management Layer"]
        RQ["TanStack Query (React Query v5)<br/>(Server State, Caching, Stale-While-Revalidate)"]
        RTK["Redux Toolkit (RTK)<br/>(Client State: Auth Token, Active Lock Timers)"]
    end

    subgraph Network_Layer ["Networking & Realtime Layer"]
        AxiosInstance["Axios Custom Instance<br/>(Interceptors, JWT Refresh, Signature Headers)"]
        SocketClient["Socket.IO Client Client<br/>(Seat Room Subscriptions, Lock Broadcasts)"]
    end

    Router --> Views
    Views --> Components
    Views --> RQ
    Views --> RTK
    RQ --> AxiosInstance
    Components <--> SocketClient
```

### Key Frontend Architectural Principles
1. **Server State vs. Client State Separation**:
   - **TanStack Query** manages all remote data (movies, showtimes, user profiles, bookings) with deterministic cache keys, automatic background polling, and optimistic UI mutations.
   - **Redux Toolkit** is strictly reserved for transient, synchronous client state: authenticated user session flags, active booking countdown timers, and UI theme toggles.
2. **Dynamic Seating Visualizer Canvas/SVG**:
   - High-performance, virtualized SVG canvas rendering seating grids up to 1,000+ seats per screen with 60 FPS interaction.
3. **Resilient Axios Interceptor Pipeline**:
   - Automatically catches `401 Unauthorized` responses, invokes the token refresh endpoint via a locked promise queue (preventing multiple concurrent refresh calls), and replays pending HTTP requests seamlessly.

---

## 3. Backend Architecture (Layered Modular Monolith)

The backend runs as a single process (or cluster of identical Node.js worker processes) structured into decoupled domain modules. Cross-module calls occur via service interfaces, not by reaching into another module's database collections.

```mermaid
flowchart TD
    subgraph Ingress ["Express Ingress Pipeline"]
        Req[Incoming HTTP Request] --> GlobalMiddlewares[Global Middlewares<br/>Helmet, CORS, Pino Logger, RateLimiter]
        GlobalMiddlewares --> AuthGuard[JWT Authentication & RBAC Guard]
        AuthGuard --> ZodValidate[Zod Request Validation]
    end

    subgraph ModuleBoundary ["Domain Module Container (e.g. BookingModule)"]
        ZodValidate --> Controller[Module Controller<br/>Unpacks HTTP Request, Maps DTO]
        Controller --> Service[Module Service<br/>Core Business Logic & Orchestration]
        Service --> LockManager[Redis Lock Manager<br/>Distributed Atomic Locks]
        Service --> Repository[Module Repository<br/>Mongoose Query Construction]
        Service --> EventPublisher[Internal Event Bus<br/>Domain Events Dispatcher]
    end

    subgraph Persistence ["Persistence Layer"]
        Repository --> MongoMongoose[MongoDB Replica Set<br/>Mongoose Multi-Doc Transactions]
        LockManager --> RedisEngine[(Redis Node/Cluster)]
    end
```

### Module Layer Responsibilities
- **Controller Layer**: Handles HTTP protocol concerns: extracts URL params, headers, query strings, and body; invokes Zod validation schemas; calls the Service layer; formats standardized JSON responses.
- **Service Layer**: Houses pure business logic, transactional workflows, policy enforcement, third-party integrations, and domain events. Completely agnostic of Express `req` or `res` objects.
- **Repository Layer**: Encapsulates all data access logic and Mongoose model queries. Enforces tenant scoping and soft-delete filters.
- **Model Layer**: Defines Mongoose schemas, field data types, database-level constraints, and indexing specs.

---

## 4. Database Architecture (MongoDB Replica Set)

MongoDB serves as the primary operational datastore configured as a minimum 3-node Replica Set (Primary - Secondary - Secondary).

```mermaid
graph LR
    subgraph AppServers ["Backend Monolith Instances"]
        App1[Node.js Instance 1]
        App2[Node.js Instance 2]
    end

    subgraph MongoCluster ["MongoDB Primary-Secondary Replica Set"]
        P[("Primary Node<br/>(Write Target & Default Reads)<br/>Write Concern: majority")]
        S1[("Secondary Node 1<br/>(Replication Lag < 100ms)<br/>Read Preference: secondaryPreferred")]
        S2[("Secondary Node 2<br/>(Read Scaling & Analytics)<br/>Read Preference: secondaryPreferred")]
    end

    App1 -->|Writes & ACID Transactions| P
    App2 -->|Writes & ACID Transactions| P
    P -->|Oplog Sync| S1
    P -->|Oplog Sync| S2
    App1 -.->|Heavy Search / Catalog Queries| S1
    App2 -.->|Reporting & Analytics Queries| S2
```

### Transaction & Consistency Strategy
- **ACID Multi-Document Transactions**: Used during critical operations: finalizing a booking, updating seat occupancy states, creating ledger payment entries, and recalculating coupon consumption.
- **Write Concern**: Enforces `{ w: "majority", j: true }` on write operations ensuring that once a booking is acknowledged, it has been durably committed to journaled storage across replica quorums.
- **Read Preference**: Write operations and real-time seat queries hit `primary`. Catalog browsing (movies, cities, genres, static cinema profiles) uses `secondaryPreferred` to reduce load on the primary node.

---

## 5. Redis Architecture (Distributed State, Locks & Caching)

Redis is deployed as an in-memory acceleration and synchronization tier fulfilling four distinct architectural roles:

```mermaid
graph TD
    subgraph RedisCluster ["Redis Operational Topology"]
        R1[Role 1: Distributed Atomic Locks<br/>Temporary Seat Holds: 10m TTL via Lua]
        R2[Role 2: High-Speed Cache<br/>City Catalog, Movie Details, Screening Schedules]
        R3[Role 3: Realtime Pub/Sub Engine<br/>Socket.IO Cross-Instance Event Relaying]
        R4[Role 4: BullMQ Job Queue Store<br/>Async PDF Generation, Email Dispatch, Lock Cleanup]
    end
```

### Key Redis Strategies
1. **Seat Lock Namespace**: `lock:show:<show_id>:seat:<seat_id>` storing `{ customer_id, locked_at, expires_at }` with strict millisecond TTLs.
2. **Catalog Caching (Stale-While-Revalidate pattern)**:
   - Key: `cache:city:<city_id>:movies:active` (TTL 10 minutes, invalidated on show publish).
   - Key: `cache:movie:<movie_id>:details` (TTL 24 hours, invalidated on admin edit).
3. **Sliding Window Rate Limiting**: Redis Sorted Sets (`zset`) tracking user IP and user ID requests per minute to stop DDoS and scalper bot attacks.

---

## 6. Socket.IO Real-time Architecture

Real-time seat state synchronization is paramount: when Customer A clicks seat `E12`, that seat must immediately transition to "LOCKED" (greyed out) on Customer B's screen in real time.

```mermaid
sequenceDiagram
    autonumber
    actor CustomerA as Customer A (Browser)
    participant Server1 as API Server Instance 1
    participant RedisPubSub as Redis Pub/Sub Adapter
    participant Server2 as API Server Instance 2
    actor CustomerB as Customer B (Browser)

    CustomerA->>Server1: Socket Connect: join_show_room { showId: "SHOW_123" }
    CustomerB->>Server2: Socket Connect: join_show_room { showId: "SHOW_123" }

    Note over CustomerA,Server1: Customer A clicks Seat F4 (Calls Lock API)
    CustomerA->>Server1: HTTP POST /api/v1/shows/SHOW_123/lock-seats { seatIds: ["F4"] }
    Server1->>Server1: Atomic Lua Lock Acquired in Redis
    Server1->>RedisPubSub: PUBLISH "socket.io#/#" { room: "show:SHOW_123", event: "SEATS_LOCKED", seatIds: ["F4"] }
    RedisPubSub->>Server2: Fan-out event to Server 2
    Server1-->>CustomerA: Socket Event: SEATS_LOCKED { seatIds: ["F4"], lockedByMe: true }
    Server2-->>CustomerB: Socket Event: SEATS_LOCKED { seatIds: ["F4"], lockedByMe: false }
    Note over CustomerB: Seat F4 immediately changes to 'Unavailable/Locked' in UI
```

### Scaling Socket.IO with Redis Adapter
When Node.js instances are scaled horizontally behind Nginx, WebSockets connect to arbitrary instances. The `@socket.io/redis-adapter` distributes room broadcasts across all Node instances using Redis Pub/Sub channels.

---

## 7. Payment Architecture (Razorpay Integration)

Financial transactions must be resilient to browser crashes, dropped Wi-Fi connections, and payment gateway network latency. The architecture relies on an **asynchronous webhook-first state machine**.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Client
    participant API as Backend Platform
    participant Redis as Redis Lock Engine
    participant DB as MongoDB
    participant Razorpay as Razorpay Gateway

    Customer->>API: POST /api/v1/bookings/initiate (showId, seatIds, couponCode)
    API->>Redis: Verify active lock belongs to customer
    API->>DB: Create Booking record (status: PENDING_PAYMENT)
    API->>Razorpay: Create Order (amount: calculated_amount, receipt: booking_id)
    Razorpay-->>API: Returns razorpay_order_id
    API-->>Customer: Return bookingId, razorpay_order_id, key_id

    Customer->>Razorpay: Opens Razorpay Checkout Modal & Completes Payment
    
    alt Synchronous Client Callback Path
        Customer->>API: POST /api/v1/payments/verify (razorpay_payment_id, signature)
        API->>API: Verify HMAC-SHA256 Signature
        API->>DB: Transition Booking to CONFIRMED inside MongoDB Transaction
        API->>Redis: Upgrade Lock to PERMANENT_BOOKED in Redis/DB
        API-->>Customer: Payment Verified & Confirmed Booking DTO
    else Asynchronous Webhook Fail-Safe Path (Client closes tab)
        Razorpay->>API: POST /api/v1/webhooks/razorpay (event: payment.captured)
        API->>API: Verify Webhook Signature Header
        API->>DB: Idempotent lookup: Is booking already CONFIRMED?
        API->>DB: If PENDING_PAYMENT -> Update to CONFIRMED
        API->>Redis: Release temporary lock; mark booked
    end
```

---

## 8. Authentication & Authorization Architecture

The platform implements a stateless JWT model paired with secure token rotation:

```mermaid
graph TD
    subgraph Client ["Client Browser"]
        Memory["Client Memory<br/>Access Token (15m validity)"]
        Cookie["HttpOnly Secure Cookie<br/>Refresh Token (7d validity)"]
    end

    subgraph Auth_Pipeline ["Backend Auth Guards"]
        VerifyJWT["1. JWT Verification Middleware<br/>(Validates Signature & Expiration)"]
        ExtractUser["2. User Hydration & Revocation Check<br/>(Redis Blocklist / User Active Status)"]
        RBAC["3. RBAC & Tenant Isolation Guard<br/>(Checks Permissions & Cinema Ownership)"]
        Controller["4. Protected Route Controller"]
    end

    Memory -->|Bearer Header in Axios| VerifyJWT
    Cookie -.->|Automatic on /refresh-token| VerifyJWT
    VerifyJWT --> ExtractUser
    ExtractUser --> RBAC
    RBAC --> Controller
```

- **Short-Lived Access Token**: Carries `userId`, `role`, and assigned `theatreIds` (for partners). Lifespan: 15 minutes.
- **Rotating Refresh Token**: Opaque cryptographically random UUID stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookie. Each refresh invalidates the prior token and issues a new pair.
- **Tenant Isolation Enforcement**: For `THEATRE_OWNER`, `THEATRE_MANAGER`, and `THEATRE_STAFF`, every request path validates that the target `theatreId` or `cinemaId` is explicitly listed in the caller's tenancy scope.

---

## 9. File Storage & Media Processing Architecture (Cloudinary)

To maintain high API throughput, media binary streams (movie posters, theatre license PDFs, banner images) never pass directly through the Express server memory.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Partner / Admin UI
    participant API as Backend Server
    participant Cloudinary as Cloudinary Cloud

    Admin->>API: GET /api/v1/media/signed-upload-url { folder: "posters" }
    API->>API: Verify Permissions & Generate HMAC Signature with Secret
    API-->>Admin: Return { uploadUrl, signature, timestamp, apiKey }
    Admin->>Cloudinary: Direct POST Form-Data (File Binary + Signature)
    Cloudinary-->>Admin: Returns { secure_url, public_id, width, height, format }
    Admin->>API: POST /api/v1/movies (moviePayload with Cloudinary secure_url)
    API->>API: Persist record in MongoDB
```

---

## 10. Asynchronous Notification & Job Architecture (BullMQ)

High-latency tasks (generating PDF tickets, rendering QR codes, transmitting transactional emails and SMS) are dispatched asynchronously via **BullMQ** running on Redis.

```mermaid
graph LR
    subgraph Express_App ["Express Web Server"]
        BookingConfirmed["Booking Confirmed Event"] --> Enqueue["BullMQ Producer<br/>ticketQueue.add('generate_ticket')"]
    end

    subgraph Redis_Broker ["Redis Queue Store"]
        QueueStore[("BullMQ Redis Data Store<br/>Job Queues & Delayed Retries")]
    end

    subgraph Worker_Pool ["Background Worker Process Pool"]
        Worker["BullMQ Worker Consumer"]
        Worker --> PDFGen["Puppeteer / PDFKit<br/>Generates Vector Ticket PDF"]
        Worker --> EmailService["Nodemailer / SendGrid<br/>Sends Email with PDF Attachment"]
        Worker --> SMSService["Twilio / Fast2SMS<br/>Sends SMS / WhatsApp confirmation"]
    end

    Enqueue --> QueueStore
    QueueStore --> Worker
```

---

## 11. Deployment & Infrastructure Architecture

The platform is fully containerized using Docker, designed to deploy onto any standard container orchestrator (Kubernetes, AWS ECS, or Docker Swarm) with zero vendor lock-in.

```mermaid
flowchart TD
    subgraph Public_Internet ["Public Edge"]
        InternetUsers((Internet Users))
    end

    subgraph DMZ ["Demilitarized Zone (Reverse Proxy)"]
        NginxProxy["Nginx Ingress / SSL Termination / Gzip Compression"]
    end

    subgraph Private_App_Subnet ["Internal Application Network (Docker Network)"]
        Node1["Container: Backend API Worker 1"]
        Node2["Container: Backend API Worker 2"]
        WorkerNode["Container: Background Job Worker"]
    end

    subgraph Private_Data_Subnet ["Isolated Persistence Network"]
        RedisNode[("Container / Managed: Redis 7.2")]
        MongoCluster[("Container / Managed: MongoDB Replica Set")]
    end

    InternetUsers -->|Port 443 HTTPS| NginxProxy
    NginxProxy -->|Round Robin HTTP| Node1
    NginxProxy -->|Round Robin HTTP| Node2

    Node1 <--> RedisNode
    Node2 <--> RedisNode
    WorkerNode <--> RedisNode

    Node1 --> MongoCluster
    Node2 --> MongoCluster
    WorkerNode --> MongoCluster
```

