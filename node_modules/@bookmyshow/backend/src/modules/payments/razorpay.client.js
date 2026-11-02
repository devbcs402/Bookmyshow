import Razorpay from 'razorpay';
import config from '../../config/env.js';
import logger from '../../config/logger.js';

class RazorpayClient {
  constructor() {
    this._instance = null;
  }

  /**
   * Initializes or returns the cached singleton Razorpay SDK instance.
   * @returns {Razorpay}
   */
  getInstance() {
    if (!this._instance) {
      if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
        logger.warn('Razorpay credentials not fully configured; using mock/fallback defaults');
      }

      this._instance = new Razorpay({
        key_id: config.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId12345678',
        key_secret: config.RAZORPAY_KEY_SECRET || 'rzp_test_mockSecret12345678'
      });
    }
    return this._instance;
  }

  /**
   * Overrides the underlying Razorpay SDK instance (useful for unit testing and test mocks).
   * @param {Object} mockInstance
   */
  setInstance(mockInstance) {
    this._instance = mockInstance;
  }

  /**
   * Creates a Razorpay Order.
   *
   * @param {Object} orderOptions
   * @param {number} orderOptions.amount Amount in smallest currency unit (e.g. paise)
   * @param {string} [orderOptions.currency='INR']
   * @param {string} orderOptions.receipt Booking Reference / PNR
   * @param {Object} [orderOptions.notes={}] Additional non-sensitive metadata
   * @returns {Promise<Object>} Created Razorpay Order
   */
  async createOrder(orderOptions) {
    const client = this.getInstance();
    return client.orders.create({
      amount: orderOptions.amount,
      currency: orderOptions.currency || config.RAZORPAY_CURRENCY || 'INR',
      receipt: orderOptions.receipt,
      notes: orderOptions.notes || {}
    });
  }

  /**
   * Fetches details of a payment from Razorpay by payment ID.
   *
   * @param {string} paymentId e.g. 'pay_29QQoUBi66xm2f'
   * @returns {Promise<Object>} Payment entity from Razorpay
   */
  async fetchPayment(paymentId) {
    const client = this.getInstance();
    return client.payments.fetch(paymentId);
  }

  /**
   * Fetches details of an order from Razorpay by order ID.
   *
   * @param {string} orderId e.g. 'order_DBJOWzybf0sJbb'
   * @returns {Promise<Object>} Order entity from Razorpay
   */
  async fetchOrder(orderId) {
    const client = this.getInstance();
    return client.orders.fetch(orderId);
  }

  /**
   * Issues a refund against a captured payment on Razorpay.
   *
   * @param {string} paymentId e.g. 'pay_29QQoUBi66xm2f'
   * @param {Object} refundOptions
   * @param {number} refundOptions.amount Amount in paise
   * @param {Object} [refundOptions.notes={}]
   * @param {string} [refundOptions.receipt]
   * @returns {Promise<Object>} Created Refund entity from Razorpay
   */
  async createRefund(paymentId, refundOptions) {
    const client = this.getInstance();
    return client.payments.refund(paymentId, {
      amount: refundOptions.amount,
      notes: refundOptions.notes || {},
      receipt: refundOptions.receipt
    });
  }
}

export const razorpayClient = new RazorpayClient();
export default razorpayClient;
