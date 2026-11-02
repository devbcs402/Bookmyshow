import crypto from 'crypto';
import config from '../../config/env.js';

export class PaymentSignatureService {
  /**
   * Generates a checkout HMAC-SHA256 signature for verification/testing.
   *
   * @param {string} orderId
   * @param {string} paymentId
   * @param {string} [secret] Defaults to config.RAZORPAY_KEY_SECRET
   * @returns {string} Hex-encoded HMAC signature
   */
  static generateCheckoutSignature(orderId, paymentId, secret = config.RAZORPAY_KEY_SECRET) {
    if (!orderId || !paymentId) {
      throw new Error('Order ID and Payment ID are required to compute signature');
    }
    const key = secret || 'rzp_test_mockSecret12345678';
    return crypto.createHmac('sha256', key).update(`${orderId}|${paymentId}`).digest('hex');
  }

  /**
   * Verifies a Razorpay checkout signature using constant-time comparison.
   *
   * @param {string} orderId
   * @param {string} paymentId
   * @param {string} signature Client-provided signature
   * @param {string} [secret] Defaults to config.RAZORPAY_KEY_SECRET
   * @returns {boolean} True if signature is genuine
   */
  static verifyCheckoutSignature(
    orderId,
    paymentId,
    signature,
    secret = config.RAZORPAY_KEY_SECRET
  ) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const expected = this.generateCheckoutSignature(orderId, paymentId, secret);
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (_err) {
      return false;
    }
  }

  /**
   * Generates a Razorpay webhook HMAC-SHA256 signature for testing.
   *
   * @param {string|Buffer} rawBody Unmutated raw request body string
   * @param {string} [secret] Defaults to config.RAZORPAY_WEBHOOK_SECRET
   * @returns {string} Hex-encoded HMAC signature
   */
  static generateWebhookSignature(rawBody, secret = config.RAZORPAY_WEBHOOK_SECRET) {
    const key = secret || 'rzp_webhook_secret_mock_123456';
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    return crypto.createHmac('sha256', key).update(bodyStr).digest('hex');
  }

  /**
   * Verifies a Razorpay webhook signature against the raw unparsed request payload.
   *
   * @param {string|Buffer} rawBody Exact raw payload received over the network
   * @param {string} signature Header 'x-razorpay-signature'
   * @param {string} [secret] Defaults to config.RAZORPAY_WEBHOOK_SECRET
   * @returns {boolean} True if genuine and unmodified
   */
  static verifyWebhookSignature(rawBody, signature, secret = config.RAZORPAY_WEBHOOK_SECRET) {
    if (!rawBody || !signature) {
      return false;
    }

    try {
      const expected = this.generateWebhookSignature(rawBody, secret);
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (_err) {
      return false;
    }
  }
}

export default PaymentSignatureService;
