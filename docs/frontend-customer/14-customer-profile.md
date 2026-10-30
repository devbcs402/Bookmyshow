# Customer Profile, Security & Session Management
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/14-customer-profile.md`**

---

## 1. Profile Management Features (`/profile`)

The customer profile interface provides 4 security and preference modules:
1. **Personal Information**:
   - Updates customer full name and mobile number.
   - Enforces 10-digit Indian mobile validation via Zod (`^[6-9]\d{9}$`).
   - Keeps customer email immutable to prevent account takeover.
2. **Password Lifecycle**:
   - Form fields: Current password, New password, Confirm password.
   - Submits to `POST /api/v1/auth/password/change`.
   - Clears password form fields upon success.
3. **Communication Channel Preferences**:
   - Toggles for Email, SMS, WhatsApp, and In-App notification channels.
   - Asynchronously updates user preferences via `PATCH /api/v1/notifications/preferences`.
4. **Active Session Inventory**:
   - Retrieves active sessions from `GET /api/v1/users/me/sessions`.
   - Displays browser User-Agent, client IP address, and login timestamp.
   - Allows patrons to revoke suspicious or stale sessions (`DELETE /api/v1/users/me/sessions/:sessionId`).

