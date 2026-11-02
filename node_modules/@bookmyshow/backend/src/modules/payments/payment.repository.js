import PaymentModel from './model/payment.model.js';
import RefundModel from './model/refund.model.js';
import PaymentWebhookModel from './model/payment-webhook.model.js';
import { PaymentStatus } from './payment.constants.js';

export class PaymentRepository {
  // ==========================================
  // PAYMENT DATA ACCESS
  // ==========================================

  /**
   * Creates a new payment transaction record.
   * @param {Object} paymentData
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>}
   */
  async create(paymentData, session = null) {
    const options = session ? { session } : {};
    const [payment] = await PaymentModel.create([paymentData], options);
    return payment;
  }

  /**
   * Finds a payment by its MongoDB ObjectId.
   * @param {string} paymentId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findById(paymentId, session = null) {
    const query = PaymentModel.findById(paymentId);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds a payment by Razorpay Order ID.
   * @param {string} orderId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findByOrderId(orderId, session = null) {
    const query = PaymentModel.findOne({ razorpayOrderId: orderId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds a payment by Razorpay Payment ID.
   * @param {string} paymentId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findByPaymentId(paymentId, session = null) {
    const query = PaymentModel.findOne({ razorpayPaymentId: paymentId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds the latest active or pending payment attempt for a booking.
   * @param {string} bookingId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findActiveByBookingId(bookingId, session = null) {
    const query = PaymentModel.findOne({
      bookingId,
      status: { $in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] }
    }).sort({ createdAt: -1 });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Retrieves all payment transactions associated with a booking.
   * @param {string} bookingId
   * @returns {Promise<Array<Object>>}
   */
  async findByBookingId(bookingId) {
    return PaymentModel.find({ bookingId }).sort({ createdAt: -1 }).lean().exec();
  }

  /**
   * Updates payment record atomically within an optional session.
   * @param {string} paymentId
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async update(paymentId, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }
    return PaymentModel.findByIdAndUpdate(paymentId, updateData, options).exec();
  }

  /**
   * Retrieves paginated payments for admin or partner audit views.
   * @param {Object} filter
   * @param {Object} options
   * @param {number} [options.page=1]
   * @param {number} [options.limit=10]
   * @returns {Promise<{ payments: Array<Object>, total: number }>}
   */
  async findWithFilters(filter = {}, options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      PaymentModel.countDocuments(filter).exec()
    ]);

    return { payments, total };
  }

  // ==========================================
  // REFUND DATA ACCESS
  // ==========================================

  /**
   * Creates a refund record.
   * @param {Object} refundData
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>}
   */
  async createRefund(refundData, session = null) {
    const options = session ? { session } : {};
    const [refund] = await RefundModel.create([refundData], options);
    return refund;
  }

  /**
   * Finds a refund by its MongoDB ObjectId.
   * @param {string} refundId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findRefundById(refundId, session = null) {
    const query = RefundModel.findById(refundId);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds a refund by Razorpay Refund ID.
   * @param {string} razorpayRefundId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findRefundByRazorpayId(razorpayRefundId, session = null) {
    const query = RefundModel.findOne({ razorpayRefundId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Finds all refunds associated with a payment ID.
   * @param {string} paymentId
   * @returns {Promise<Array<Object>>}
   */
  async findRefundsByPaymentId(paymentId) {
    return RefundModel.find({ paymentId }).sort({ createdAt: -1 }).lean().exec();
  }

  /**
   * Calculates the total amount already refunded for a payment.
   * @param {string} paymentId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<number>}
   */
  async getTotalRefundedAmount(paymentId, session = null) {
    const query = RefundModel.aggregate([
      {
        $match: {
          paymentId:
            typeof paymentId === 'string'
              ? new PaymentModel.base.Types.ObjectId(paymentId)
              : paymentId,
          status: { $in: ['PENDING', 'PROCESSING', 'SUCCESS'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$refundAmount' }
        }
      }
    ]);
    if (session) {
      query.session(session);
    }
    const result = await query.exec();
    return result[0]?.total || 0;
  }

  /**
   * Updates refund status and details.
   * @param {string} refundId
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async updateRefund(refundId, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }
    return RefundModel.findByIdAndUpdate(refundId, updateData, options).exec();
  }

  // ==========================================
  // WEBHOOK AUDIT LOG DATA ACCESS
  // ==========================================

  /**
   * Persists an incoming webhook event payload.
   * @param {Object} webhookData
   * @returns {Promise<Object>}
   */
  async createWebhookLog(webhookData) {
    return PaymentWebhookModel.create(webhookData);
  }

  /**
   * Finds webhook event by unique eventId.
   * @param {string} eventId
   * @returns {Promise<Object|null>}
   */
  async findWebhookByEventId(eventId) {
    return PaymentWebhookModel.findOne({ eventId }).exec();
  }

  /**
   * Marks a webhook event as successfully processed.
   * @param {string} eventId
   * @param {Object} [meta={}]
   * @returns {Promise<Object|null>}
   */
  async markWebhookProcessed(eventId, meta = {}) {
    return PaymentWebhookModel.findOneAndUpdate(
      { eventId },
      {
        $set: {
          processed: true,
          processedAt: new Date(),
          errorLog: meta.errorLog || ''
        }
      },
      { new: true }
    ).exec();
  }
}

export const paymentRepository = new PaymentRepository();
export default paymentRepository;
