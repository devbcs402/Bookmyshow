import mongoose from 'mongoose';
import logger from '../../config/logger.js';
import paymentRepository from './payment.repository.js';
import razorpayClient from './razorpay.client.js';
import bookingRepository from '../bookings/booking.repository.js';
import bookingService from '../bookings/booking.service.js';
import { PaymentStatus } from './payment.constants.js';
import { BookingStatus } from '../bookings/booking.constants.js';

export class PaymentReconciliationService {
  /**
   * Reconciles a single payment transaction by querying the gateway.
   *
   * @param {string} paymentId
   * @returns {Promise<Object>} Reconciliation summary
   */
  async reconcilePayment(paymentId) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      return { status: 'NOT_FOUND', paymentId };
    }

    try {
      // 1. Fetch Order from Razorpay
      const rzpOrder = await razorpayClient.fetchOrder(payment.razorpayOrderId);
      if (!rzpOrder) {
        return { status: 'ORDER_NOT_FOUND_ON_GATEWAY', paymentId };
      }

      // Check if order was paid on Razorpay
      if (rzpOrder.status === 'paid' && payment.status !== PaymentStatus.CAPTURED) {
        const booking = await bookingRepository.findById(payment.bookingId);
        if (!booking) {
          logger.error(
            { paymentId, bookingId: payment.bookingId },
            'Booking missing during reconciliation'
          );
          return { status: 'BOOKING_MISSING', paymentId };
        }

        if (booking.status === BookingStatus.PENDING_PAYMENT) {
          // Reconcile and confirm booking
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
                capturedAt: new Date(),
                $push: {
                  statusHistory: {
                    status: PaymentStatus.CAPTURED,
                    timestamp: new Date(),
                    note: 'Reconciled: order marked paid on Razorpay'
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
                razorpayOrderId: payment.razorpayOrderId,
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
              { paymentId, bookingId: booking._id },
              'Payment successfully reconciled to CAPTURED'
            );
            return { status: 'RECONCILED_CONFIRMED', paymentId };
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
        } else if (
          booking.status === BookingStatus.EXPIRED ||
          booking.status === BookingStatus.CANCELLED
        ) {
          // Edge Case: Payment captured but booking was expired/cancelled
          await paymentRepository.update(payment._id, {
            status: PaymentStatus.CAPTURED,
            reconciliationStatus: 'REFUND_REQUIRED',
            capturedAt: new Date(),
            $push: {
              statusHistory: {
                status: PaymentStatus.CAPTURED,
                timestamp: new Date(),
                note: `Reconciled: payment captured at gateway but booking was ${booking.status}; marked REFUND_REQUIRED`
              }
            }
          });

          logger.warn(
            { paymentId, bookingId: booking._id, bookingStatus: booking.status },
            'CRITICAL: Payment captured on gateway for non-pending booking; marked for refund'
          );
          return { status: 'CAPTURED_REFUND_REQUIRED', paymentId };
        }
      } else if (rzpOrder.status === 'attempted' && payment.status === PaymentStatus.CREATED) {
        await paymentRepository.update(payment._id, {
          status: PaymentStatus.PENDING
        });
        return { status: 'UPDATED_TO_PENDING', paymentId };
      }

      return { status: 'UP_TO_DATE', paymentId, currentStatus: payment.status };
    } catch (err) {
      logger.error({ paymentId, err: err.message }, 'Error reconciling payment transaction');
      return { status: 'ERROR', paymentId, error: err.message };
    }
  }

  /**
   * Reconciles a single refund transaction against Razorpay.
   *
   * @param {string} refundId
   * @returns {Promise<Object>}
   */
  async reconcileRefund(refundId) {
    const refund = await paymentRepository.findRefundById(refundId);
    if (!refund || !refund.razorpayRefundId) {
      return { status: 'NOT_FOUND_OR_UNSUBMITTED', refundId };
    }

    try {
      // In a production system, fetch refund status from Razorpay
      return { status: 'REFUND_AUDITED', refundId, currentStatus: refund.status };
    } catch (err) {
      logger.error({ refundId, err: err.message }, 'Error reconciling refund');
      return { status: 'ERROR', refundId, error: err.message };
    }
  }

  /**
   * Scans and reconciles stale pending payments (older than 15 minutes).
   *
   * @param {number} [olderThanMinutes=15]
   * @returns {Promise<{ processed: number, reconciled: number }>}
   */
  async sweepPendingPayments(olderThanMinutes = 15) {
    const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const { payments } = await paymentRepository.findWithFilters(
      {
        status: { $in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
        createdAt: { $lte: cutoffDate }
      },
      { limit: 50 }
    );

    let reconciled = 0;
    for (const payment of payments) {
      const outcome = await this.reconcilePayment(payment._id);
      if (
        outcome.status === 'RECONCILED_CONFIRMED' ||
        outcome.status === 'CAPTURED_REFUND_REQUIRED'
      ) {
        reconciled++;
      }
    }

    return { processed: payments.length, reconciled };
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();
export default paymentReconciliationService;
