import mongoose from 'mongoose';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import paymentRepository from './payment.repository.js';
import razorpayClient from './razorpay.client.js';
import PaymentSignatureService from './payment-signature.service.js';
import PaymentStatusService from './payment-status.service.js';
import { PaymentStatus, RefundStatus, RefundReason, WebhookEvents } from './payment.constants.js';

import bookingRepository from '../bookings/booking.repository.js';
import bookingService from '../bookings/booking.service.js';
import { BookingStatus } from '../bookings/booking.constants.js';
import BookingQrService from '../bookings/booking-qr.service.js';
import { Roles } from '../auth/auth.constants.js';

import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class PaymentService {
  /**
   * Creates a Razorpay Order for a valid pending booking.
   *
   * @param {string} customerId
   * @param {Object} payload
   * @param {string} payload.bookingId
   * @param {string|null} [idempotencyKey=null]
   * @returns {Promise<Object>} Client checkout parameters
   */
  async createPaymentOrder(customerId, payload, idempotencyKey = null) {
    const { bookingId } = payload;
    if (!bookingId) {
      throw new AppError(
        'Booking ID is mandatory',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 1. Fetch & Validate Booking
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND);
    }

    // 2. Validate Ownership (BOLA defense)
    if (booking.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'Booking not found under your account',
        HttpStatus.NOT_FOUND,
        ErrorCodes.BOOKING_NOT_FOUND
      );
    }

    // 3. Validate Booking State
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new AppError(
        `Booking is in '${booking.status}' state and is not eligible for payment`,
        HttpStatus.CONFLICT,
        ErrorCodes.INVALID_BOOKING_STATUS
      );
    }

    // 4. Validate Expiration
    if (new Date(booking.expiresAt).getTime() <= Date.now()) {
      throw new AppError(
        'Booking checkout window has expired. Please select your seats again.',
        HttpStatus.CONFLICT,
        ErrorCodes.BOOKING_ALREADY_EXPIRED
      );
    }

    // 5. Idempotency & Active Payment Order Reuse
    const existingActivePayment = await paymentRepository.findActiveByBookingId(bookingId);
    if (existingActivePayment && existingActivePayment.razorpayOrderId) {
      logger.info(
        { bookingId, orderId: existingActivePayment.razorpayOrderId },
        'Reusing existing active Razorpay order for booking'
      );

      return {
        keyId: config.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId12345678',
        orderId: existingActivePayment.razorpayOrderId,
        amount: existingActivePayment.amountInPaise,
        currency: existingActivePayment.currency,
        bookingReference: booking.bookingReference,
        bookingId: booking._id,
        paymentId: existingActivePayment._id
      };
    }

    // 6. Calculate Precise Server-Side Amount in Paise
    const netPayable = Number(booking.netPayableAmount);
    const amountInPaise = Math.round((netPayable + Number.EPSILON) * 100);

    if (amountInPaise <= 0) {
      throw new AppError(
        'Payable amount must be greater than zero',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_PAYMENT_AMOUNT
      );
    }

    // 7. Create Gateway Order on Razorpay
    let rzpOrder = null;
    try {
      rzpOrder = await razorpayClient.createOrder({
        amount: amountInPaise,
        currency: config.RAZORPAY_CURRENCY || 'INR',
        receipt: booking.bookingReference,
        notes: {
          bookingId: booking._id.toString(),
          customerId: customerId.toString(),
          bookingReference: booking.bookingReference
        }
      });
    } catch (gatewayErr) {
      logger.error({ err: gatewayErr.message, bookingId }, 'Failed to create order on Razorpay');
      throw new AppError(
        'Payment gateway order generation failed. Please try again.',
        HttpStatus.BAD_GATEWAY,
        ErrorCodes.PAYMENT_ORDER_CREATION_FAILED
      );
    }

    // 8. Persist Payment Transaction Record
    const initialStatusHistory = [
      PaymentStatusService.createStatusHistoryEntry(
        PaymentStatus.PENDING,
        customerId,
        'Razorpay order created; awaiting checkout completion'
      )
    ];

    const paymentDoc = {
      bookingId: booking._id,
      customerId: booking.customerId,
      partnerId: booking.partnerId,
      gateway: 'RAZORPAY',
      razorpayOrderId: rzpOrder.id,
      amount: netPayable,
      amountInPaise,
      currency: rzpOrder.currency || config.RAZORPAY_CURRENCY || 'INR',
      status: PaymentStatus.PENDING,
      idempotencyKey,
      statusHistory: initialStatusHistory
    };

    const savedPayment = await paymentRepository.create(paymentDoc);

    logger.info(
      { paymentId: savedPayment._id, orderId: rzpOrder.id, bookingId: booking._id },
      'Payment order successfully created and persisted'
    );

    // 9. Return Minimal, Safe Client Checkout Payload
    return {
      keyId: config.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId12345678',
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      bookingReference: booking.bookingReference,
      bookingId: booking._id,
      paymentId: savedPayment._id
    };
  }

  /**
   * Verifies Razorpay checkout HMAC signature and confirms booking.
   *
   * @param {string} customerId
   * @param {Object} payload
   * @param {string} payload.razorpay_order_id
   * @param {string} payload.razorpay_payment_id
   * @param {string} payload.razorpay_signature
   * @param {string} [payload.bookingId]
   * @returns {Promise<Object>} Verification outcome & confirmed booking
   */
  async verifyPayment(customerId, payload) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId: _bookingId
    } = payload;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        'Order ID, Payment ID, and Signature are mandatory for payment verification',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 1. Constant-Time HMAC Signature Verification
    const isSignatureValid = PaymentSignatureService.verifyCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      logger.warn(
        { customerId, orderId: razorpay_order_id, paymentId: razorpay_payment_id },
        'Payment signature verification failed'
      );
      throw new AppError(
        'Payment verification failed: cryptographic signature mismatch',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_PAYMENT_SIGNATURE
      );
    }

    // 2. Locate Internal Payment Record
    const payment = await paymentRepository.findByOrderId(razorpay_order_id);
    if (!payment) {
      throw new AppError(
        'Payment record not found for the specified order',
        HttpStatus.NOT_FOUND,
        ErrorCodes.PAYMENT_NOT_FOUND
      );
    }

    // 3. Verify Ownership (BOLA)
    if (payment.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'Payment not authorized under your account',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    // 4. Locate Booking
    const booking = await bookingRepository.findById(payment.bookingId);
    if (!booking) {
      throw new AppError(
        'Associated booking record not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.BOOKING_NOT_FOUND
      );
    }

    // 5. Idempotency Check: Already Confirmed?
    if (payment.status === PaymentStatus.CAPTURED && booking.status === BookingStatus.CONFIRMED) {
      logger.info(
        { paymentId: payment._id, bookingId: booking._id },
        'Payment and booking already confirmed; returning idempotent success'
      );
      const ticketView = BookingQrService.buildTicketPayload(booking);
      return {
        payment: {
          id: payment._id,
          orderId: payment.razorpayOrderId,
          paymentId: payment.razorpayPaymentId,
          status: payment.status,
          amount: payment.amount
        },
        booking: {
          ...(booking.toObject ? booking.toObject() : booking),
          ticketView
        }
      };
    }

    // 6. Check Expiration Race Condition
    if (booking.status === BookingStatus.EXPIRED || booking.status === BookingStatus.CANCELLED) {
      // Payment was captured on gateway, but booking was already marked expired by sweeper!
      await paymentRepository.update(payment._id, {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        capturedAt: new Date(),
        verifiedAt: new Date(),
        reconciliationStatus: 'REFUND_REQUIRED',
        $push: {
          statusHistory: {
            status: PaymentStatus.CAPTURED,
            timestamp: new Date(),
            actorId: customerId,
            note: `Payment verified after booking reached ${booking.status}; marked REFUND_REQUIRED`
          }
        }
      });

      logger.warn(
        { bookingId: booking._id, paymentId: payment._id },
        'Payment captured for already expired/cancelled booking; flagged for refund'
      );

      throw new AppError(
        'Payment succeeded at gateway, but the booking window expired. Your payment has been safely recorded and queued for automatic refund.',
        HttpStatus.CONFLICT,
        ErrorCodes.BOOKING_ALREADY_EXPIRED
      );
    }

    // 7. Atomic Transaction: Transition Payment to CAPTURED and Booking to CONFIRMED
    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (_e) {
        session = null;
      }
    }

    let confirmedBooking = null;
    let updatedPayment = null;

    try {
      // Update Payment
      updatedPayment = await paymentRepository.update(
        payment._id,
        {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          verifiedAt: new Date(),
          capturedAt: new Date(),
          $push: {
            statusHistory: {
              status: PaymentStatus.CAPTURED,
              timestamp: new Date(),
              actorId: customerId,
              note: 'Payment signature verified; payment captured'
            }
          }
        },
        session
      );

      // Confirm Booking via centralized service
      confirmedBooking = await bookingService.confirmBooking(
        booking._id,
        {
          paymentId: payment._id,
          gateway: 'RAZORPAY',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: payment.amount,
          capturedAt: new Date()
        },
        customerId,
        session
      );

      if (session) {
        await session.commitTransaction();
      }
    } catch (txErr) {
      if (session) {
        await session.abortTransaction();
      }
      logger.error(
        { err: txErr.message, paymentId: payment._id },
        'Transaction error during payment confirmation'
      );
      throw txErr;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    logger.info(
      {
        paymentId: updatedPayment._id,
        bookingId: confirmedBooking._id,
        reference: confirmedBooking.bookingReference
      },
      'Payment verified and booking confirmed successfully'
    );

    const ticketView = BookingQrService.buildTicketPayload(confirmedBooking);
    return {
      payment: {
        id: updatedPayment._id,
        orderId: updatedPayment.razorpayOrderId,
        paymentId: updatedPayment.razorpayPaymentId,
        status: updatedPayment.status,
        amount: updatedPayment.amount
      },
      booking: {
        ...(confirmedBooking.toObject ? confirmedBooking.toObject() : confirmedBooking),
        ticketView
      }
    };
  }

  /**
   * Processes a Razorpay webhook event with signature verification and idempotency.
   *
   * @param {string|Buffer} rawBody
   * @param {string} signature 'x-razorpay-signature' header
   * @param {string|null} [eventHeaderId=null] 'x-razorpay-event-id' header
   * @returns {Promise<Object>} Processing outcome
   */
  async processWebhook(rawBody, signature, eventHeaderId = null) {
    // 1. Signature Verification
    const isSignatureValid = PaymentSignatureService.verifyWebhookSignature(rawBody, signature);
    if (!isSignatureValid) {
      logger.warn({ signature }, 'Invalid Razorpay webhook signature received');
      throw new AppError(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_WEBHOOK_SIGNATURE
      );
    }

    // 2. Parse Payload
    let payload = null;
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch (_err) {
      throw new AppError(
        'Malformed webhook payload JSON',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const event = payload.event;
    const eventId = eventHeaderId || payload.event_id || payload.id || `evt_${Date.now()}`;

    // 3. Webhook Idempotency Check
    const existingLog = await paymentRepository.findWebhookByEventId(eventId);
    if (existingLog && existingLog.processed) {
      logger.info(
        { eventId, event },
        'Duplicate webhook event received; safely returning idempotent 200 OK'
      );
      return { status: 'ignored_duplicate', eventId, event };
    }

    // 4. Record Webhook Ingress
    if (!existingLog) {
      try {
        await paymentRepository.createWebhookLog({
          eventId,
          eventType: event,
          signature,
          isSignatureValid: true,
          payload,
          processed: false
        });
      } catch (_logErr) {
        // Ignored if race condition inserted duplicate
      }
    }

    // 5. Handle Specific Events
    try {
      if (event === WebhookEvents.PAYMENT_CAPTURED || event === WebhookEvents.ORDER_PAID) {
        await this._handleWebhookPaymentCaptured(payload);
      } else if (event === WebhookEvents.PAYMENT_FAILED) {
        await this._handleWebhookPaymentFailed(payload);
      } else if (event === WebhookEvents.REFUND_PROCESSED) {
        await this._handleWebhookRefundProcessed(payload);
      } else if (event === WebhookEvents.REFUND_FAILED) {
        await this._handleWebhookRefundFailed(payload);
      } else {
        logger.info(
          { event, eventId },
          'Webhook event type acknowledged without state modification'
        );
      }

      await paymentRepository.markWebhookProcessed(eventId);
      return { status: 'processed', eventId, event };
    } catch (err) {
      logger.error({ err: err.message, eventId, event }, 'Error processing webhook event');
      await paymentRepository.markWebhookProcessed(eventId, { errorLog: err.message });
      throw err;
    }
  }

  /**
   * Internal handler for payment.captured and order.paid webhooks.
   * @private
   */
  async _handleWebhookPaymentCaptured(payload) {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      logger.warn({ payload }, 'Webhook payment.captured missing order_id; skipping');
      return;
    }

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      logger.warn({ orderId }, 'Payment record not found for webhook order_id');
      return;
    }

    const booking = await bookingRepository.findById(payment.bookingId);
    if (!booking) {
      logger.error({ bookingId: payment.bookingId }, 'Booking not found for webhook payment');
      return;
    }

    if (booking.status === BookingStatus.CONFIRMED && payment.status === PaymentStatus.CAPTURED) {
      logger.info({ orderId }, 'Webhook arrived for already confirmed booking; no-op');
      return;
    }

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      let session = null;
      if (mongoose.connection.readyState === 1) {
        try {
          session = await mongoose.startSession();
          session.startTransaction();
        } catch (_e) {
          session = null;
        }
      }

      try {
        await paymentRepository.update(
          payment._id,
          {
            status: PaymentStatus.CAPTURED,
            razorpayPaymentId: paymentId || payment.razorpayPaymentId,
            capturedAt: new Date(),
            verifiedAt: new Date(),
            paymentMethod: paymentEntity?.method || payment.paymentMethod,
            paymentDetails: {
              method: paymentEntity?.method || '',
              vpa: paymentEntity?.vpa || '',
              cardNetwork: paymentEntity?.card?.network || '',
              cardLast4: paymentEntity?.card?.last4 || '',
              bankName: paymentEntity?.bank || '',
              wallet: paymentEntity?.wallet || ''
            },
            gatewayResponse: paymentEntity || {},
            $push: {
              statusHistory: {
                status: PaymentStatus.CAPTURED,
                timestamp: new Date(),
                note: 'Webhook payment.captured received and verified'
              }
            }
          },
          session
        );

        await bookingService.confirmBooking(
          booking._id,
          {
            paymentId: payment._id,
            gateway: 'RAZORPAY',
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            amount: payment.amount,
            capturedAt: new Date()
          },
          null,
          session
        );

        if (session) {
          await session.commitTransaction();
        }
        logger.info(
          { bookingId: booking._id, orderId },
          'Booking confirmed via webhook payment.captured'
        );
      } catch (err) {
        if (session) {
          await session.abortTransaction();
        }
        throw err;
      } finally {
        if (session) {
          session.endSession();
        }
      }
    } else {
      // Booking expired or cancelled
      await paymentRepository.update(payment._id, {
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: paymentId || payment.razorpayPaymentId,
        capturedAt: new Date(),
        reconciliationStatus: 'REFUND_REQUIRED',
        $push: {
          statusHistory: {
            status: PaymentStatus.CAPTURED,
            timestamp: new Date(),
            note: `Webhook received after booking ${booking.status}; marked REFUND_REQUIRED`
          }
        }
      });
      logger.warn(
        { bookingId: booking._id, bookingStatus: booking.status },
        'Webhook payment.captured received for non-pending booking; flagged for refund'
      );
    }
  }

  /**
   * Internal handler for payment.failed webhook.
   * @private
   */
  async _handleWebhookPaymentFailed(payload) {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (!orderId) {
      return;
    }

    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment) {
      return;
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      // Never overwrite captured state with failed event
      return;
    }

    await paymentRepository.update(payment._id, {
      status: PaymentStatus.FAILED,
      errorCode: paymentEntity?.error_code || 'GATEWAY_DECLINE',
      errorDescription: paymentEntity?.error_description || 'Payment failed at gateway',
      gatewayResponse: paymentEntity || {},
      $push: {
        statusHistory: {
          status: PaymentStatus.FAILED,
          timestamp: new Date(),
          note: `Webhook payment.failed: ${paymentEntity?.error_description || 'Declined'}`
        }
      }
    });

    logger.info({ paymentId: payment._id, orderId }, 'Payment marked FAILED via webhook');
  }

  /**
   * Internal handler for refund.processed webhook.
   * @private
   */
  async _handleWebhookRefundProcessed(payload) {
    const refundEntity = payload.payload?.refund?.entity;
    const refundId = refundEntity?.id;
    if (!refundId) {
      return;
    }

    const refund = await paymentRepository.findRefundByRazorpayId(refundId);
    if (!refund) {
      logger.warn({ refundId }, 'Refund record not found for webhook refund.processed');
      return;
    }

    await paymentRepository.updateRefund(refund._id, {
      status: RefundStatus.SUCCESS,
      settledAt: new Date(),
      gatewayResponse: refundEntity
    });

    // Check if entire payment is refunded
    const totalRefunded = await paymentRepository.getTotalRefundedAmount(refund.paymentId);
    const payment = await paymentRepository.findById(refund.paymentId);

    if (payment) {
      const isFullRefund = totalRefunded >= payment.amount;
      const targetPaymentStatus = isFullRefund
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      await paymentRepository.update(payment._id, {
        status: targetPaymentStatus,
        $push: {
          statusHistory: {
            status: targetPaymentStatus,
            timestamp: new Date(),
            note: `Refund ${refundId} confirmed settled by gateway webhook`
          }
        }
      });

      if (isFullRefund) {
        await bookingRepository.updateStatus(payment.bookingId, BookingStatus.REFUNDED, {
          status: BookingStatus.REFUNDED,
          timestamp: new Date(),
          note: 'Full payment refunded and verified via webhook'
        });
      }
    }

    logger.info({ refundId, paymentId: refund.paymentId }, 'Refund confirmed settled via webhook');
  }

  /**
   * Internal handler for refund.failed webhook.
   * @private
   */
  async _handleWebhookRefundFailed(payload) {
    const refundEntity = payload.payload?.refund?.entity;
    const refundId = refundEntity?.id;
    if (!refundId) {
      return;
    }

    const refund = await paymentRepository.findRefundByRazorpayId(refundId);
    if (!refund) {
      return;
    }

    await paymentRepository.updateRefund(refund._id, {
      status: RefundStatus.FAILED,
      failureReason: refundEntity?.error_description || 'Refund payout failed at gateway',
      gatewayResponse: refundEntity
    });

    logger.warn({ refundId }, 'Refund marked FAILED via webhook');
  }

  /**
   * Initiates an authorized refund against a captured payment.
   *
   * @param {string} paymentId
   * @param {Object} actor
   * @param {Object} refundData
   * @param {number} refundData.amount
   * @param {string} refundData.reason
   * @param {number} [refundData.deductions=0]
   * @returns {Promise<Object>} Created refund record
   */
  async initiateRefund(paymentId, actor, refundData) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError(
        'Payment transaction not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.PAYMENT_NOT_FOUND
      );
    }

    // Role and Tenancy Validation
    if (actor.role === Roles.CUSTOMER) {
      throw new AppError(
        'Customers cannot initiate direct arbitrary refunds',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    } else if (actor.role === Roles.THEATRE_OWNER || actor.role === Roles.THEATRE_MANAGER) {
      if (payment.partnerId.toString() !== actor.partnerId?.toString()) {
        throw new AppError(
          'Payment does not belong to your theatre organization',
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
    }

    if (
      payment.status !== PaymentStatus.CAPTURED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new AppError(
        `Refund cannot be initiated for payment in '${payment.status}' state`,
        HttpStatus.CONFLICT,
        ErrorCodes.INVALID_PAYMENT_STATUS
      );
    }

    const { amount, reason = RefundReason.CUSTOMER_REQUESTED, deductions = 0 } = refundData;
    if (!amount || amount <= 0) {
      throw new AppError(
        'Refund amount must be greater than zero',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Calculate maximum allowable refund
    const totalPreviouslyRefunded = await paymentRepository.getTotalRefundedAmount(paymentId);
    const availableToRefund = payment.amount - totalPreviouslyRefunded;

    if (amount > availableToRefund) {
      throw new AppError(
        `Requested refund amount (₹${amount}) exceeds maximum available refundable balance (₹${availableToRefund})`,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.REFUND_EXCEEDS_CAPTURED_AMOUNT
      );
    }

    const refundAmountPaise = Math.round(amount * 100);

    // Call Razorpay Refund API
    let rzpRefund = null;
    try {
      rzpRefund = await razorpayClient.createRefund(payment.razorpayPaymentId, {
        amount: refundAmountPaise,
        notes: {
          paymentId: payment._id.toString(),
          bookingId: payment.bookingId.toString(),
          reason
        }
      });
    } catch (gatewayErr) {
      logger.error({ err: gatewayErr.message, paymentId }, 'Razorpay refund generation failed');
      throw new AppError(
        `Payment gateway rejected refund request: ${gatewayErr.message}`,
        HttpStatus.BAD_GATEWAY,
        ErrorCodes.REFUND_FAILED
      );
    }

    // Persist Refund Record
    const refundDoc = {
      bookingId: payment.bookingId,
      paymentId: payment._id,
      customerId: payment.customerId,
      partnerId: payment.partnerId,
      razorpayRefundId: rzpRefund.id,
      grossAmount: payment.amount,
      deductions,
      refundAmount: amount,
      refundAmountPaise,
      currency: payment.currency,
      reason,
      status: RefundStatus.SUCCESS, // Razorpay instant refunds default to processed/success
      gatewayResponse: rzpRefund,
      initiatedBy: actor.id,
      initiatedAt: new Date(),
      settledAt: new Date()
    };

    const savedRefund = await paymentRepository.createRefund(refundDoc);

    // Update Payment State
    const newTotalRefunded = totalPreviouslyRefunded + amount;
    const isFullRefund = newTotalRefunded >= payment.amount;
    const newPaymentStatus = isFullRefund
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await paymentRepository.update(payment._id, {
      status: newPaymentStatus,
      $push: {
        statusHistory: {
          status: newPaymentStatus,
          timestamp: new Date(),
          actorId: actor.id,
          note: `Refund of ₹${amount} issued via Razorpay (${rzpRefund.id})`
        }
      }
    });

    // Update Booking State if full refund
    if (isFullRefund) {
      await bookingRepository.updateStatus(payment.bookingId, BookingStatus.REFUNDED, {
        status: BookingStatus.REFUNDED,
        timestamp: new Date(),
        actorId: actor.id,
        note: `Booking fully refunded (₹${amount})`
      });
    }

    logger.info(
      { refundId: savedRefund._id, rzpRefundId: rzpRefund.id, amount },
      'Refund initiated and settled successfully'
    );

    return savedRefund;
  }

  /**
   * Retrieves payment transaction details with role & tenant isolation.
   *
   * @param {string} paymentId
   * @param {Object} actor
   * @returns {Promise<Object>}
   */
  async getPaymentDetails(paymentId, actor) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', HttpStatus.NOT_FOUND, ErrorCodes.PAYMENT_NOT_FOUND);
    }

    // BOLA & Tenancy Checks
    if (actor.role === Roles.CUSTOMER) {
      if (payment.customerId.toString() !== actor.id.toString()) {
        throw new AppError(
          'Payment not found under your account',
          HttpStatus.NOT_FOUND,
          ErrorCodes.PAYMENT_NOT_FOUND
        );
      }
    } else if (actor.role === Roles.THEATRE_OWNER || actor.role === Roles.THEATRE_MANAGER) {
      if (payment.partnerId.toString() !== actor.partnerId?.toString()) {
        throw new AppError(
          'Payment not found under your cinema organization',
          HttpStatus.NOT_FOUND,
          ErrorCodes.PAYMENT_NOT_FOUND
        );
      }
    } else if (actor.role !== Roles.SUPER_ADMIN) {
      throw new AppError(
        'Access to payment details denied',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    const refunds = await paymentRepository.findRefundsByPaymentId(paymentId);

    return {
      ...(payment.toObject ? payment.toObject() : payment),
      refunds
    };
  }

  /**
   * Retrieves all payment attempts for a given booking.
   *
   * @param {string} bookingId
   * @param {Object} actor
   * @returns {Promise<Array<Object>>}
   */
  async getBookingPayments(bookingId, actor) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND);
    }

    // Tenancy Check
    if (actor.role === Roles.CUSTOMER) {
      if (booking.customerId.toString() !== actor.id.toString()) {
        throw new AppError(
          'Booking not found under your account',
          HttpStatus.NOT_FOUND,
          ErrorCodes.BOOKING_NOT_FOUND
        );
      }
    } else if (actor.role === Roles.THEATRE_OWNER || actor.role === Roles.THEATRE_MANAGER) {
      if (booking.partnerId.toString() !== actor.partnerId?.toString()) {
        throw new AppError(
          'Booking not found under your organization',
          HttpStatus.NOT_FOUND,
          ErrorCodes.BOOKING_NOT_FOUND
        );
      }
    } else if (actor.role !== Roles.SUPER_ADMIN) {
      throw new AppError(
        'Access to booking payments denied',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    return paymentRepository.findByBookingId(bookingId);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
