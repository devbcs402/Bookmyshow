# Known Issues & Extension Points
## BookMyShow Multi-Theatre Ticket Booking Platform

**Documentation Date:** November 2, 2026  
**Auditor:** Senior Software Architect & Integration Specialist

---

## 1. Documented Extension Points (Missing Backend Endpoints)

In accordance with strict platform rules prohibiting fabricated endpoints or fake mutations, the following operational extension points are documented:

### 1. Global Customer User Explorer (`/api/v1/admin/users`)
- **Status**: Backend does not mount a standalone public user directory endpoint under `/api/v1/admin/users` to safeguard consumer data privacy.
- **Handling**: The Super Admin Dashboard implements a user exploration overview using aggregate metrics (`/api/v1/admin/analytics/overview`), actor activity tracking via Audit Logs (`/api/v1/admin/audit-logs`), and exhibitor directory records.
- **Roadmap Action**: When user moderation (such as consumer account suspension) is required, a dedicated admin users controller can be mounted with role-filtered pagination.

### 2. Promotional Coupons Management (`/api/v1/admin/coupons`)
- **Status**: The backend currently implements coupon application logic during booking calculation, but standalone administrative CRUD routes (`/api/v1/admin/coupons`) are pending controller registration.
- **Handling**: The Super Admin Dashboard presents a complete schema contract specification and blueprint interface documenting the exact coupon schema and validation constraints.
- **Roadmap Action**: Mount `/api/v1/admin/coupons` with coupon creation, discount percentage/flat rules, and expiration lifecycles.

---

## 2. External Provider Test Credentials & Mocks

### Razorpay Test Credentials
- The repository is configured with test mode defaults (`rzp_test_...`).
- In local development, the checkout flow operates seamlessly using Razorpay's documented test checkout mode and mock signature verification.
- For production deployments, live Razorpay API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) must be provided via cloud environment secrets.

### Omnichannel Notifications (Email / SMS / WhatsApp)
- Set to `mock` provider by default (`EMAIL_PROVIDER=mock`, `SMS_PROVIDER=mock`, `WHATSAPP_PROVIDER=mock`).
- Dispatched messages are printed to local server logs and stored in the database without attempting external network calls to Twilio, SendGrid, or Meta APIs during offline development.
- In production, set `EMAIL_PROVIDER=smtp` or `resend`, `SMS_PROVIDER=twilio` or `fast2sms`, and configure real provider API tokens.

---

## 3. Browser Environment Limitations in Automated Unit Tests

- During Vitest execution in JSDOM, browser window navigation (`window.location.assign`) and raw XHR cancellation emit non-fatal JSDOM warnings (`Error: AggregateError / Not implemented: navigation`).
- These warnings do not affect browser runtime execution and all unit and integration test assertions pass with a 100% pass rate.

