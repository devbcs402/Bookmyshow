# BookMyShow - Customer Frontend (React SPA)

Production-grade customer web application for the BookMyShow movie ticket booking platform. Built with React 18, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod, and Socket.IO Client.

---

## 1. Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Backend running on `http://localhost:5000`

### Installation
```bash
# Navigate to customer frontend
cd apps/customer-frontend

# Install dependencies
npm install

# Setup environment configuration
cp .env.example .env
```

### Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173`.

### Production Build
```bash
npm run build
```
Generates production-optimized chunks in `dist/`.

### Run Automated Tests
```bash
npm run test
```

---

## 2. Key Capabilities
- **Movie Discovery**: Dynamic hero banner, personalized recommendations, now-showing, upcoming releases, and explore by genre.
- **Search & Multi-Facet Filtering**: Debounced autocomplete suggestions, filters for language, genre, format, and status.
- **City Selection**: Persistent city switcher with automatic theatre & show scheduling discovery.
- **Cinema & Showtimes**: 7-day date selector strip, format badges (2D, 3D, IMAX, 4DX), and sold-out detection.
- **Real-Time Interactive Seating Layout**: Physical rows, category tiers (Platinum, Gold, Silver), and live seat status.
- **Distributed Atomic Seat Locking**: Direct integration with Part 9 Redis Lua lock API, lock countdown timer, and automatic renewal.
- **Real-Time WebSocket Sync**: Show room subscriptions (`seat:locked`, `seat:released`, `seat:expired`, `seat:booked`).
- **Booking Engine**: Server-calculated pricing snapshot, idempotency key defense.
- **Razorpay Checkout Integration**: Standard gateway checkout modal, test card payments, and cryptographic HMAC signature verification.
- **Digital Ticket Pass**: Confirmed booking PNR, show details, cryptographically signed QR code, and print support.
- **Booking History**: All, Upcoming, Completed, and Cancelled tabs with cancellation policy enforcement and refund status.
- **Profile & Settings**: Profile updates, password rotation, communication channel toggles, and active login session management.
- **Notification Center**: Real-time alerts, unread badge counter, mark all as read.

