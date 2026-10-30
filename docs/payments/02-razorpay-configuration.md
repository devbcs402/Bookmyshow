# Part 11 — Razorpay Gateway Configuration & Environment Setup

## 1. Overview

The Razorpay integration requires specific environment configuration, credential management, currency controls, and express middleware initialization to guarantee security and idempotency across development, staging, and production environments.

---

## 2. Environment Variables

All payment-related configuration parameters are strongly validated at backend bootstrap using Zod in `src/config/env.js`:

| Variable Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | `string` | Yes | `rzp_test_placeholder` | Public key provided by Razorpay dashboard for SDK initialization and client checkout options. |
| `RAZORPAY_KEY_SECRET` | `string` | Yes | `rzp_secret_placeholder` | Private secret key used exclusively on backend to compute and verify HMAC-SHA256 signatures. |
| `RAZORPAY_WEBHOOK_SECRET` | `string` | Yes | `rzp_webhook_secret_placeholder` | Shared secret configured in the Razorpay Webhooks dashboard for payload signing verification. |
| `RAZORPAY_CURRENCY` | `string` | No | `'INR'` | ISO 4217 3-letter currency code for order creation and settlements. |
| `PAYMENT_ORDER_EXPIRY_MINUTES` | `number` | No | `15` | Default lifetime in minutes for generated gateway orders. |

### Environment File Sample (`.env`)
```bash
# ==============================================================================
# PAYMENT GATEWAY (RAZORPAY) CONFIGURATION
# ==============================================================================
RAZORPAY_KEY_ID=rzp_test_YourTestKeyId12345
RAZORPAY_KEY_SECRET=YourSecretKeyGoesHere67890
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecretGoesHere112233
RAZORPAY_CURRENCY=INR
PAYMENT_ORDER_EXPIRY_MINUTES=15
```

---

## 3. Express Application Configuration: Preserving Raw Body

Razorpay webhook signature verification requires computing an HMAC-SHA256 digest over the exact, unparsed byte sequence of the HTTP request body. Standard JSON parsers mutate whitespace, character escaping, and property ordering, causing HMAC calculation discrepancies.

In `src/app.js`, `express.json` is configured with a custom `verify` callback to preserve `req.rawBody` without impacting standard body parsing:

```javascript
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);
```

This ensures:
1. All normal endpoints receive standard parsed `req.body`.
2. Webhook handlers access `req.rawBody` for cryptographically exact HMAC signature validation.

---

## 4. Razorpay Client Singleton (`razorpay.client.js`)

The SDK client is wrapped in a thread-safe singleton wrapper supporting dependency injection during unit testing:

```javascript
class RazorpayClientWrapper {
  constructor() {
    this.client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }

  async createOrder({ amountPaise, currency, receipt, notes }) { ... }
  async fetchPayment(paymentId) { ... }
  async fetchOrder(orderId) { ... }
  async createRefund(paymentId, { amountPaise, notes }) { ... }
}
```

---

## 5. Security & Secret Rotation Checklist

1. **Dashboard Restrictions**: In production, ensure API keys have restricted IP allowances where supported.
2. **Key Storage**: Never commit real secret keys to source control. Use AWS Secrets Manager, HashiCorp Vault, or Google Cloud Secret Manager in production.
3. **Webhook Whitelisting**: Razorpay publishes an official egress IP list. In high-security production setups, reverse proxy firewalls should restrict `POST /api/v1/payments/webhook/razorpay` to Razorpay edge IPs.

