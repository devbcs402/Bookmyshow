# Part 12 — Customer Notification Preferences & Consent Governance

## 1. Overview

Modern consumer platforms must respect user privacy, channel fatigue, and regulatory mandates regarding unsolicited messages. The platform implements a granular preference engine (`NotificationPreferenceService`) allowing customers to customize their communication channels while strictly preserving essential account security advisories.

---

## 2. Preference Hierarchy & Channel Toggles

Customer preferences are modeled in the `notification_preferences` collection:

```json
{
  "userId": "65f1a2b3c4d5e6f7a8b9c001",
  "channels": {
    "email": true,
    "sms": true,
    "whatsapp": false,
    "inApp": true
  },
  "categories": {
    "bookingUpdates": true,
    "paymentUpdates": true,
    "promotionalUpdates": false,
    "securityAlerts": true
  },
  "preferredLanguage": "en",
  "whatsappConsent": false,
  "whatsappConsentAt": null
}
```

---

## 3. Mandatory Security Advisory Invariant

Users are **prohibited** from disabling security-critical notifications:
- If a client sends `PATCH /api/v1/notifications/preferences` with `categories.securityAlerts = false`, the request is rejected with `400 Bad Request`:
  > *"Account security alerts are mandatory and cannot be disabled"*
- Events classified under `NotificationCategory.SECURITY` (e.g. OTP codes, password resets, suspicious logins) bypass promotional toggles and deliver over the primary verified channel (Email or SMS) even if marketing updates are disabled.

---

## 4. Transactional vs Promotional Separation

Under telecommunications regulations (TRAI DLT and international CAN-SPAM / GDPR):
1. **Transactional Alerts** (`TRANSACTIONAL`):
   - Booking confirmations, payment receipts, refund updates, show cancellations.
   - Delivered to users who have opted into booking and payment updates.
2. **Promotional Alerts** (`MARKETING`):
   - Discount offers, weekend movie suggestions, merchandise promotions.
   - Disabled by default (`promotionalUpdates: false`).
   - Requires explicit opt-in. Cannot be disguised as transactional to circumvent user preferences.

---

## 5. WhatsApp Consent & Opt-In Governance

- Due to Meta's strict A2P guidelines, WhatsApp notifications require explicit opt-in (`whatsappConsent: true`).
- When toggled, the exact ISO timestamp of consent is recorded (`whatsappConsentAt: new Date()`).
- If a user withdraws consent, outbound WhatsApp message dispatch is immediately blocked at the provider adapter boundary.

