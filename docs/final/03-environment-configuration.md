# Environment Configuration Guide
## BookMyShow Multi-Theatre Ticket Booking Platform

This document describes all environment variables used across the backend and the three frontend single-page applications.

---

## 1. Backend API Configuration (`apps/backend/.env`)

Located at `apps/backend/.env` (and documented in `apps/backend/.env.example` and root `.env.example`).

```ini
# Runtime & Networking
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000

# Inter-Application URLs
CUSTOMER_APP_URL=http://localhost:5173
THEATRE_DASHBOARD_URL=http://localhost:5174
ADMIN_DASHBOARD_URL=http://localhost:5175

# Feature Toggles & Metrics
ENABLE_SWAGGER=true
METRICS_ENABLED=true
INTERNAL_METRICS_TOKEN=bms_internal_metrics_secret_token_12345

# Primary Datastore & Cache
MONGODB_URI=mongodb://localhost:27017/bookmyshow_dev
REDIS_URL=redis://localhost:6379

# Cryptographic Tokens (Must be 32+ characters long)
JWT_ACCESS_SECRET=development_jwt_access_secret_super_secure_and_long_enough_for_dev_32char
JWT_REFRESH_SECRET=development_jwt_refresh_secret_super_secure_and_long_enough_for_dev_32char
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=debug

# Cookie Security
TRUST_PROXY=0
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=

# Seat Locking & Reservation Limits
SEAT_LOCK_TTL_SECONDS=300
MAX_SEATS_PER_LOCK=10
MAX_LOCK_RENEWALS=2

# Booking Fees & Cutoff Windows
BOOKING_PAYMENT_WINDOW_SECONDS=300
DEFAULT_CONVENIENCE_FEE=30.00
DEFAULT_TAX_PERCENT=18.00
BOOKING_CANCELLATION_CUTOFF_HOURS=2

# Razorpay Payment Gateway (Test Mode Defaults)
RAZORPAY_KEY_ID=rzp_test_mockKeyId12345678
RAZORPAY_KEY_SECRET=rzp_test_mockSecret12345678
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_mock_123456
RAZORPAY_CURRENCY=INR
PAYMENT_ORDER_EXPIRY_MINUTES=15

# Omnichannel Notifications
EMAIL_PROVIDER=mock
EMAIL_FROM_NAME=BookMyShow Support
EMAIL_FROM_ADDRESS=no-reply@bookmyshow.example.com
SMS_PROVIDER=mock
SMS_SENDER_ID=BMSIND
WHATSAPP_PROVIDER=mock
```

---

## 2. Customer Frontend Configuration (`apps/customer-frontend/.env`)

Located at `apps/customer-frontend/.env`:

```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=BookMyShow
VITE_RAZORPAY_KEY_ID=rzp_test_bookmyshow1234
```

---

## 3. Theatre Partner Dashboard Configuration (`apps/theatre-dashboard/.env`)

Located at `apps/theatre-dashboard/.env`:

```ini
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 4. Super Admin Console Configuration (`apps/admin-dashboard/.env`)

Located at `apps/admin-dashboard/.env`:

```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=Super Admin Dashboard
```

---

## 5. Security Rules

- **Never Commit `.env` Files**: `.env` is ignored in `.gitignore`.
- **Zero Frontend Secrets**: Frontend bundles only receive public URLs and public gateway identifiers (`VITE_RAZORPAY_KEY_ID`). Private keys, webhook secrets, and database credentials remain strictly on the backend.

