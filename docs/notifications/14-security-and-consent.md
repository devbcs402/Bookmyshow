# Part 12 — Notification Security, Privacy & Consent Compliance

## 1. Overview

Communication channels interface directly with end-user personal contact details (email addresses and mobile phone numbers). Security and privacy engineering must enforce stringent access controls, data sanitization, credential protection, and regulatory consent compliance.

---

## 2. Zero PII & Sensitive Credential Leakage

### A. Masked Logging
To comply with global privacy frameworks (GDPR and India's DPDP Act):
- Phone numbers are masked in all logs: `+919876543210` -> `+9198****3210`.
- Passwords, OTP codes, JWT secrets, and payment card numbers are **never** logged in notification delivery traces.

### B. Secret Management
- External gateway API keys (`RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, `FAST2SMS_API_KEY`, `WHATSAPP_ACCESS_TOKEN`) are strictly injected through environment variables.
- Gateway credentials are never exposed in database records, client responses, or version control.

---

## 3. Broken Object Level Authorization (BOLA / IDOR) Defense

Notification records are scoped strictly to the authenticated user's ID:
```javascript
// Verification pattern across all customer routes:
const notification = await Notification.findOneAndUpdate(
  { _id: notificationId, userId: req.user.id, isDeleted: false },
  { $set: updateFields }
);
if (!notification) {
  throw new AppError('Notification not found or access denied', HttpStatus.NOT_FOUND);
}
```
*Security Invariant*: Attempting to read, mark read, or delete another customer's notification returns a `404 Not Found` rather than a `403 Forbidden`, preventing malicious actors from probing valid notification IDs.

---

## 4. Anti-Injection Sanitization (XSS Defense)

All user-supplied variables rendered in HTML email templates undergo entity escaping via `TemplateEngine.escapeHtml()`:
- `&` -> `&amp;`
- `<` -> `&lt;`
- `>` -> `&gt;`
- `"` -> `&quot;`
- `'` -> `&#39;`

Even if a malicious user creates a booking with a crafted name like `<script>stealCookie()</script>`, the rendered email safely outputs `&lt;script&gt;stealCookie()&lt;/script&gt;` as harmless inert text.

---

## 5. Regulatory Consent & Anti-Spam Governance

1. **Mandatory Security Exception**: Critical account security communications (OTP, password reset, token reuse detection) are legally classified as transactional necessities and cannot be disabled by user preference toggles.
2. **Promotional Opt-In Consent**: Promotional updates are disabled by default. Marketing notifications are blocked before reaching provider adapters unless explicit consent is on record.
3. **WhatsApp Explicit Opt-In**: The system strictly enforces verified opt-in before dispatching WhatsApp templates.

