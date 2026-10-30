# Frontend Architecture & Technical Specifications
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/02-frontend-architecture.md`**

---

## 1. Architectural Philosophy

The customer-facing application is built as a **modular, reactive Single-Page Application (SPA)** utilizing React 18, Vite, and Tailwind CSS. The design adheres to strict architectural boundaries:
- **Clean Feature Slices**: Code is grouped by domain feature (`auth`, `home`, `movies`, `theatres`, `seat-selection`, `bookings`, `payments`, `notifications`, `profile`, `wishlist`).
- **Server State vs. Client State Separation**: All server-derived data (movies, showtimes, seating layouts, bookings, notifications) is managed exclusively via **TanStack Query** (React Query v5). Ephemeral UI states (user profile session, selected city, active seat lock countdown) reside in focused **Zustand stores**.
- **Contract-First API Integration**: Centralized Axios client normalizes response envelopes and guarantees dual-token rotation without leaking authentication logic into UI components.

---

## 2. Directory Hierarchy

```text
apps/customer-frontend/
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layouts/
│   │   │   └── RootLayout.jsx
│   │   ├── providers/
│   │   │   └── AppProviders.jsx
│   │   └── router/
│   │       ├── index.jsx
│   │       └── ProtectedRoute.jsx
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── CountdownTimer.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── NotFoundPage.jsx
│   │   │   └── Skeleton.jsx
│   │   ├── navigation/
│   │   │   ├── CitySelectorModal.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Header.jsx
│   │   │   └── SearchAutocompleteDropdown.jsx
│   │   ├── movie/
│   │   │   ├── MovieCard.jsx
│   │   │   └── MovieCarousel.jsx
│   │   ├── theatre/
│   │   │   └── TheatreCard.jsx
│   │   ├── show/
│   │   │   ├── DateSelector.jsx
│   │   │   └── ShowtimePill.jsx
│   │   ├── seat/
│   │   │   └── SeatingLayoutGrid.jsx
│   │   └── booking/
│   │       ├── DigitalTicketCard.jsx
│   │       ├── PriceSummaryBreakdown.jsx
│   │       └── TicketQR.jsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   ├── home/
│   │   │   └── HomePage.jsx
│   │   ├── movies/
│   │   │   ├── MovieDetailsPage.jsx
│   │   │   ├── MoviesPage.jsx
│   │   │   └── SearchPage.jsx
│   │   ├── theatres/
│   │   │   ├── TheatreDetailPage.jsx
│   │   │   └── TheatresPage.jsx
│   │   ├── seat-selection/
│   │   │   └── SeatSelectionPage.jsx
│   │   ├── bookings/
│   │   │   ├── BookingConfirmationPage.jsx
│   │   │   ├── BookingReviewPage.jsx
│   │   │   └── MyBookingsPage.jsx
│   │   ├── payments/
│   │   │   └── PaymentPage.jsx
│   │   ├── notifications/
│   │   │   └── NotificationsPage.jsx
│   │   ├── profile/
│   │   │   └── ProfilePage.jsx
│   │   └── wishlist/
│   │       └── WishlistPage.jsx
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   └── useShowSeatsSocket.js
│   ├── services/
│   │   ├── api/
│   │   │   ├── auth.api.js
│   │   │   ├── axios.client.js
│   │   │   ├── bookings.api.js
│   │   │   ├── discovery.api.js
│   │   │   ├── movies.api.js
│   │   │   ├── notifications.api.js
│   │   │   ├── payments.api.js
│   │   │   ├── seat-locks.api.js
│   │   │   ├── shows.api.js
│   │   │   ├── theatres.api.js
│   │   │   ├── users.api.js
│   │   │   └── wishlist.api.js
│   │   ├── payment/
│   │   │   └── razorpay.service.js
│   │   └── socket/
│   │       └── socket.client.js
│   ├── store/
│   │   ├── auth.store.js
│   │   ├── city.store.js
│   │   └── seatLock.store.js
│   ├── styles/
│   │   └── index.css
│   ├── tests/
│   │   ├── components/
│   │   ├── features/
│   │   └── setup.js
│   ├── utils/
│   │   ├── cn.js
│   │   └── formatters.js
│   ├── constants/
│   │   └── index.js
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── .env.example
```

---

## 3. Core Design Principles

1. **Zero Client-Authoritative Pricing**: The frontend never calculates the final ticket price, tax rates, or convenience fee. All numbers rendered in checkout and receipt originate directly from server calculation engines.
2. **Resilient Network Handling**: Automated Axios request retry on transient failures, mutex-protected JWT rotation on 401s, and socket auto-reconnection with automatic room re-subscription.
3. **Optimistic UI with Conflict Rollbacks**: Local seat selections are immediately responsive; if an atomic backend lock fails, the seating grid rolls back and displays clear error feedback.
4. **Accessible Semantics**: ARIA roles, high-contrast dark theme tokens, semantic HTML5 tags (`<header>`, `<main>`, `<section>`, `<footer>`), and accessible keyboard controls on interactive SVG seat buttons.

