# Part 12 — Email Provider Integration & Delivery Engine

## 1. Overview

The Email Integration Engine (`EmailProviderAdapter`) provides rich, responsive transactional email capabilities for the movie ticket booking platform. It generates dynamic HTML notifications (such as digital ticket confirmation receipts, OTP verification codes, and password reset requests) while maintaining a plain-text fallback.

---

## 2. Supported Email Providers

The platform architecture adopts a vendor-independent factory pattern:

| Provider | Configuration Key | Protocol / SDK | Rationale & Use Case |
| :--- | :--- | :--- | :--- |
| **Resend** | `EMAIL_PROVIDER=resend` | REST HTTPS API | Modern transactional email API with high inbox delivery rates and sub-second dispatch. Zero extra npm dependencies required. |
| **SMTP** | `EMAIL_PROVIDER=smtp` | SMTP / TLS (Port 587/465) | Enterprise mail relays (Amazon SES, SendGrid, Postmark, internal corporate Postfix/Exim servers). |
| **Mock** | `EMAIL_PROVIDER=mock` | In-Memory / Structured Log | Default for local development and automated CI/CD pipelines. Never calls external network or incurs costs. |

---

## 3. Configuration & Credentials

All email settings are strongly validated via Zod in `src/config/env.js`:

```bash
# ==============================================================================
# EMAIL NOTIFICATION CONFIGURATION
# ==============================================================================
EMAIL_PROVIDER=mock                # 'mock' | 'smtp' | 'resend'
EMAIL_FROM_NAME=BookMyShow Support
EMAIL_FROM_ADDRESS=no-reply@bookmyshow.example.com
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@bookmyshow.example.com
SMTP_PASS=your_smtp_password_here
RESEND_API_KEY=re_1234567890abcdef
```

---

## 4. Email Formatting & Responsive Layout

All transactional email templates include:
1. **Brand Identity**: Styled BookMyShow header with prominent status badges.
2. **Metadata Table**: Clear tabular breakdown of movie title, cinema name, auditorium, show date, show time, and seat numbers.
3. **Call-to-Action (CTA)**: High-contrast button redirecting to the digital QR ticket view (`/tickets/<bookingReference>`).
4. **Plain-Text Fallback**: Clean ASCII text representation ensuring accessibility on legacy mail clients and wearable devices.
5. **Anti-Injection Escaping**: All dynamic variables (customer names, movie titles) are automatically HTML-escaped by `TemplateEngine.render()` unless explicitly declared as raw sub-components.

---

## 5. Delivery Tracking & Error Recovery

When `emailProvider.sendEmail()` executes:
- A unique `messageId` is returned by the upstream provider.
- The corresponding `NotificationDelivery` record transitions from `PROCESSING` to `SENT` with `providerMessageId` and timestamp.
- In case of provider timeout or network failure, the error is recorded, and the job is rescheduled with exponential backoff.

