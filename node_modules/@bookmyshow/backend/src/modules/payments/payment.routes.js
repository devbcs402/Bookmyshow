import { Router } from 'express';
import paymentController from './payment.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { paymentLimiter } from '../../middlewares/rate-limit.middleware.js';
import { Roles } from '../auth/auth.constants.js';
import {
  createOrderSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
  getPaymentByIdSchema
} from './payment.validation.js';

const router = Router();

/**
 * @openapi
 * /payments/create-order:
 *   post:
 *     summary: Create a Razorpay Order for a pending booking
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: 65f1a2b3c4d5e6f7a8b9c099
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Booking expired or ineligible
 */
router.post(
  '/create-order',
  paymentLimiter,
  authenticate,
  authorize(Roles.CUSTOMER, Roles.SUPER_ADMIN),
  validate(createOrderSchema),
  paymentController.createOrder
);

/**
 * @openapi
 * /payments/verify:
 *   post:
 *     summary: Verify Razorpay checkout signature and confirm booking
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *                 example: order_DBJOWzybf0sJbb
 *               razorpay_payment_id:
 *                 type: string
 *                 example: pay_29QQoUBi66xm2f
 *               razorpay_signature:
 *                 type: string
 *                 example: 9ef426ebf606b111a62d53a330070e36e4bb9a0ef44979f8295b882ac377ac82
 *     responses:
 *       200:
 *         description: Payment verified and booking confirmed
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Order not found
 */
router.post(
  '/verify',
  paymentLimiter,
  authenticate,
  authorize(Roles.CUSTOMER, Roles.SUPER_ADMIN),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

/**
 * @openapi
 * /payments/webhook/razorpay:
 *   post:
 *     summary: Ingress endpoint for Razorpay webhook notifications
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       400:
 *         description: Invalid webhook signature
 */
router.post('/webhook/razorpay', paymentController.handleWebhook);

/**
 * @openapi
 * /payments/{paymentId}:
 *   get:
 *     summary: Get payment transaction details
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved
 *       404:
 *         description: Payment not found
 */
router.get(
  '/:paymentId',
  authenticate,
  validate(getPaymentByIdSchema),
  paymentController.getPaymentDetails
);

/**
 * @openapi
 * /payments/{paymentId}/refunds:
 *   post:
 *     summary: Initiate a refund against a captured payment
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500
 *               reason:
 *                 type: string
 *                 example: CUSTOMER_REQUESTED
 *               deductions:
 *                 type: number
 *                 example: 30
 *     responses:
 *       201:
 *         description: Refund initiated successfully
 *       400:
 *         description: Refund exceeds captured amount
 */
router.post(
  '/:paymentId/refunds',
  authenticate,
  authorize(Roles.THEATRE_OWNER, Roles.THEATRE_MANAGER, Roles.SUPER_ADMIN),
  validate(refundPaymentSchema),
  paymentController.initiateRefund
);

export default router;
