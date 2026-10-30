# Frontend Security, XSS Defense & Privacy
**Part 15: Customer Frontend Development (React)**
**Document Reference: `docs/frontend-customer/16-security.md`**

---

## 1. Security Architecture & Threat Mitigations

| Threat Vector | Mitigation Strategy |
|---|---|
| **Cross-Site Scripting (XSS)** | React's native JSX escaping prevents HTML injection; no `dangerouslySetInnerHTML` is used. Content Security Policy headers enforced by backend Helmet. |
| **Cross-Site Request Forgery (CSRF)** | Refresh token cookie is configured with `SameSite=Strict` and `HttpOnly`. Access token is transmitted explicitly in the `Authorization: Bearer` header. |
| **Broken Object Level Authorization (BOLA)** | Frontend routes always validate user ownership against backend envelopes; navigating to an unauthorized `/booking/:bookingId` triggers backend 404/403. |
| **Token Theft / Leakage** | Long-lived refresh tokens are stored in HttpOnly cookies inaccessible to JavaScript. Short-lived access tokens expire in 15 minutes. |
| **Gateway Secret Exposure** | Vite environment variables only expose public configuration (`VITE_RAZORPAY_KEY_ID`). Private gateway secrets are strictly forbidden in client bundles. |
| **Payment Tampering** | Payment amounts and orders are created strictly on the backend. Frontend only relays checkout identifiers and Razorpay signatures for HMAC verification. |

---

## 2. Input Validation Defense

All customer form inputs are validated using **Zod** schemas before transmission:
- Email syntax validation (`z.string().email()`).
- Indian mobile phone number regex (`/^[6-9]\d{9}$/`).
- Password minimum complexity rules (`z.string().min(6)`).
- Seat selection limits (1–10 seats maximum).

