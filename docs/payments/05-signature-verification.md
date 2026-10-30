# Part 11 — Cryptographic Signature Verification & Security

## 1. Overview

In payment processing, data integrity and origin authenticity are critical. Without server-side cryptographic verification, a malicious actor could intercept or forge client callbacks to mark unpaid bookings as confirmed.

This platform enforces **HMAC-SHA256 Cryptographic Verification** using Node.js's native `crypto` module with constant-time equality checks (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.

---

## 2. Checkout Response Signature Verification

When a customer completes payment through the Razorpay Standard Checkout SDK modal, the client receives:
- `razorpay_order_id`: The server-generated order ID (e.g., `order_DBJOWzybf0sJbb`).
- `razorpay_payment_id`: The gateway payment identifier (e.g., `pay_29QQoUBi66xm2f`).
- `razorpay_signature`: The hex-encoded HMAC-SHA256 signature produced by Razorpay.

The client sends these three fields to `POST /api/v1/payments/verify`.

### Verification Algorithm

1. Concatenate the order ID and payment ID separated by a vertical pipe (`|`):
   $$\text{payload} = \text{razorpay\_order\_id} + "|" + \text{razorpay\_payment\_id}$$
2. Compute the HMAC-SHA256 digest of this payload using `RAZORPAY_KEY_SECRET`:
   $$\text{expectedSignature} = \text{HMAC-SHA256}(\text{payload}, \text{RAZORPAY\_KEY\_SECRET})$$
3. Compare the client-supplied signature with the expected signature in **constant time**:
   ```javascript
   const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
   const providedBuffer = Buffer.from(razorpaySignature, 'utf8');

   if (expectedBuffer.length !== providedBuffer.length) {
     return false;
   }

   return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
   ```

---

## 3. Webhook Signature Verification

Webhooks received at `POST /api/v1/payments/webhook/razorpay` contain the signature in the `x-razorpay-signature` request header.

### Algorithm & Raw Body Preservation

1. Razorpay signs the exact network payload (raw unparsed string bytes).
2. The server extracts `req.rawBody` (captured during initial Express body buffering in `src/app.js`).
3. Compute expected signature:
   $$\text{expectedSignature} = \text{HMAC-SHA256}(\text{rawBody}, \text{RAZORPAY\_WEBHOOK\_SECRET})$$
4. Compare using `crypto.timingSafeEqual`.

```javascript
static verifyWebhookSignature(rawBody, signature, secret = env.RAZORPAY_WEBHOOK_SECRET) {
  if (!rawBody || !signature || typeof signature !== 'string') {
    return false;
  }
  const payloadStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
```

---

## 4. Why Constant-Time Equality Matters

Standard string comparisons (`===` or `strA == strB`) short-circuit on the first mismatched byte:
- An attacker can measure request processing latency variations down to nanoseconds.
- By iteratively guessing character by character, the attacker could deduce the genuine HMAC signature byte-by-byte.
- `crypto.timingSafeEqual` always compares the entire buffer regardless of where mismatches occur, completely eliminating timing side-channels.

