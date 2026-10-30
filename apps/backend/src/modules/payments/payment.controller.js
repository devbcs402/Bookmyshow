import ApiResponse from '../../common/responses/api-response.js';
import paymentService from './payment.service.js';

export class PaymentController {
  /**
   * POST /api/v1/payments/create-order
   */
  async createOrder(req, res, next) {
    try {
      const customerId = req.user.id;
      const idempotencyKey =
        req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || null;
      const order = await paymentService.createPaymentOrder(customerId, req.body, idempotencyKey);
      return ApiResponse.created(res, {
        message: 'Razorpay order created successfully',
        data: order
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/payments/verify
   */
  async verifyPayment(req, res, next) {
    try {
      const customerId = req.user.id;
      const result = await paymentService.verifyPayment(customerId, req.body);
      return ApiResponse.success(res, {
        message: 'Payment verified and booking confirmed successfully',
        data: result
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/payments/webhook/razorpay
   */
  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const eventHeaderId = req.headers['x-razorpay-event-id'] || null;
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const outcome = await paymentService.processWebhook(rawBody, signature, eventHeaderId);
      return ApiResponse.success(res, {
        message: 'Webhook processed successfully',
        data: outcome
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/payments/:paymentId
   */
  async getPaymentDetails(req, res, next) {
    try {
      const payment = await paymentService.getPaymentDetails(req.params.paymentId, req.user);
      return ApiResponse.success(res, {
        message: 'Payment details retrieved successfully',
        data: payment
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/bookings/:bookingId/payments
   */
  async getBookingPayments(req, res, next) {
    try {
      const payments = await paymentService.getBookingPayments(req.params.bookingId, req.user);
      return ApiResponse.success(res, {
        message: 'Booking payments history retrieved successfully',
        data: payments
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/payments/:paymentId/refunds
   */
  async initiateRefund(req, res, next) {
    try {
      const refund = await paymentService.initiateRefund(req.params.paymentId, req.user, req.body);
      return ApiResponse.created(res, {
        message: 'Refund initiated successfully',
        data: refund
      });
    } catch (err) {
      return next(err);
    }
  }
}

export const paymentController = new PaymentController();
export default paymentController;
