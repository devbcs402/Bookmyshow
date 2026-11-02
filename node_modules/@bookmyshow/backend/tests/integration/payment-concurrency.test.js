import { jest } from '@jest/globals';
import paymentService from '../../src/modules/payments/payment.service.js';
import paymentRepository from '../../src/modules/payments/payment.repository.js';
import PaymentSignatureService from '../../src/modules/payments/payment-signature.service.js';
import bookingRepository from '../../src/modules/bookings/booking.repository.js';
import bookingService from '../../src/modules/bookings/booking.service.js';
import { PaymentStatus } from '../../src/modules/payments/payment.constants.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('Payment Concurrency, Race Condition & Idempotency Tests', () => {
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockBookingId = '65f1a2b3c4d5e6f7a8b9c099';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockOrderId = 'order_DBJOWzybf0sJbb';
  const mockPaymentId = 'pay_29QQoUBi66xm2f';
  const mockSignature = '9ef426ebf606b111a62d53a330070e36e4bb9a0ef44979f8295b882ac377ac82';

  const mockBookingDoc = {
    _id: mockBookingId,
    bookingReference: 'BK-20261030-XYZ789',
    customerId: mockCustomerId,
    partnerId: mockPartnerId,
    netPayableAmount: 500,
    status: BookingStatus.PENDING_PAYMENT,
    expiresAt: new Date(Date.now() + 300 * 1000)
  };

  const mockPaymentDoc = {
    _id: 'payment-id-1',
    bookingId: mockBookingId,
    customerId: mockCustomerId,
    partnerId: mockPartnerId,
    razorpayOrderId: mockOrderId,
    razorpayPaymentId: mockPaymentId,
    status: PaymentStatus.PENDING,
    amount: 500
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Duplicate Webhook Delivery', () => {
    it('should confirm booking on first delivery and return idempotent duplicate on subsequent deliveries', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyWebhookSignature').mockReturnValue(true);

      const webhookPayload = {
        event: 'payment.captured',
        event_id: 'evt_unique_101',
        payload: {
          payment: {
            entity: {
              id: mockPaymentId,
              order_id: mockOrderId,
              amount: 50000,
              method: 'upi'
            }
          }
        }
      };

      let webhookProcessedState = false;
      jest.spyOn(paymentRepository, 'findWebhookByEventId').mockImplementation(() => {
        if (webhookProcessedState) {
          return Promise.resolve({ eventId: 'evt_unique_101', processed: true });
        }
        return Promise.resolve(null);
      });

      jest.spyOn(paymentRepository, 'createWebhookLog').mockResolvedValue({});
      jest.spyOn(paymentRepository, 'markWebhookProcessed').mockImplementation(() => {
        webhookProcessedState = true;
        return Promise.resolve({});
      });

      jest.spyOn(paymentRepository, 'findByOrderId').mockResolvedValue(mockPaymentDoc);
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBookingDoc);
      jest.spyOn(paymentRepository, 'update').mockResolvedValue({
        ...mockPaymentDoc,
        status: PaymentStatus.CAPTURED
      });

      const confirmSpy = jest.spyOn(bookingService, 'confirmBooking').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.CONFIRMED
      });

      // Delivery 1
      const res1 = await paymentService.processWebhook(
        JSON.stringify(webhookPayload),
        'sig_101',
        'evt_unique_101'
      );
      expect(res1.status).toBe('processed');
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      // Delivery 2 (Duplicate)
      const res2 = await paymentService.processWebhook(
        JSON.stringify(webhookPayload),
        'sig_101',
        'evt_unique_101'
      );
      expect(res2.status).toBe('ignored_duplicate');
      expect(confirmSpy).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Scenario 2: Simultaneous Webhook and Frontend Verification Race', () => {
    it('should result in one consistent confirmed transaction when frontend verify and webhook arrive concurrently', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(true);
      jest.spyOn(PaymentSignatureService, 'verifyWebhookSignature').mockReturnValue(true);

      let currentPaymentStatus = PaymentStatus.PENDING;
      let currentBookingStatus = BookingStatus.PENDING_PAYMENT;

      jest.spyOn(paymentRepository, 'findByOrderId').mockImplementation(() =>
        Promise.resolve({
          ...mockPaymentDoc,
          status: currentPaymentStatus
        })
      );

      jest.spyOn(bookingRepository, 'findById').mockImplementation(() =>
        Promise.resolve({
          ...mockBookingDoc,
          status: currentBookingStatus
        })
      );

      jest.spyOn(paymentRepository, 'update').mockImplementation((_id, update) => {
        if (update.status) {
          currentPaymentStatus = update.status;
        }
        return Promise.resolve({
          ...mockPaymentDoc,
          status: currentPaymentStatus
        });
      });

      const confirmSpy = jest
        .spyOn(bookingService, 'confirmBooking')
        .mockImplementation((_bookingId, _data) => {
          currentBookingStatus = BookingStatus.CONFIRMED;
          return Promise.resolve({
            ...mockBookingDoc,
            status: BookingStatus.CONFIRMED
          });
        });

      jest.spyOn(paymentRepository, 'findWebhookByEventId').mockResolvedValue(null);
      jest.spyOn(paymentRepository, 'createWebhookLog').mockResolvedValue({});
      jest.spyOn(paymentRepository, 'markWebhookProcessed').mockResolvedValue({});

      // Run both concurrently
      const frontendVerifyPromise = paymentService.verifyPayment(mockCustomerId, {
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
        bookingId: mockBookingId
      });

      const webhookPromise = paymentService.processWebhook(
        JSON.stringify({
          event: 'payment.captured',
          payload: { payment: { entity: { id: mockPaymentId, order_id: mockOrderId } } }
        }),
        'webhook_sig',
        'evt_race_123'
      );

      const [verifyResult, webhookResult] = await Promise.all([
        frontendVerifyPromise,
        webhookPromise
      ]);

      expect(verifyResult.payment.status).toBe(PaymentStatus.CAPTURED);
      expect(verifyResult.booking.status).toBe(BookingStatus.CONFIRMED);
      expect(webhookResult.status).toBe('processed');

      // Booking confirmed once
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Payment Confirmation and Booking Expiration Race', () => {
    it('should refuse to silently lose money if payment succeeds after booking was expired, flagging REFUND_REQUIRED', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(true);

      // Booking was expired by sweeper worker just before verify arrived
      jest.spyOn(paymentRepository, 'findByOrderId').mockResolvedValue(mockPaymentDoc);
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.EXPIRED
      });

      const updateSpy = jest.spyOn(paymentRepository, 'update').mockResolvedValue({
        ...mockPaymentDoc,
        status: PaymentStatus.CAPTURED,
        reconciliationStatus: 'REFUND_REQUIRED'
      });

      // Verification should abort booking confirmation but transition payment to CAPTURED + REFUND_REQUIRED
      await expect(
        paymentService.verifyPayment(mockCustomerId, {
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature
        })
      ).rejects.toThrow(AppError);

      expect(updateSpy).toHaveBeenCalledWith(
        mockPaymentDoc._id,
        expect.objectContaining({
          status: PaymentStatus.CAPTURED,
          reconciliationStatus: 'REFUND_REQUIRED'
        })
      );
    });
  });

  describe('Scenario 4: Duplicate Simultaneous Refund Race', () => {
    it('should reject refund request if cumulative refund exceeds captured amount', async () => {
      const paymentRecord = {
        _id: 'payment-id-1',
        partnerId: mockPartnerId,
        status: PaymentStatus.CAPTURED,
        amount: 500,
        currency: 'INR',
        razorpayPaymentId: mockPaymentId
      };
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue(paymentRecord);

      // First refund of 300 already settled
      jest.spyOn(paymentRepository, 'getTotalRefundedAmount').mockResolvedValue(300);

      const actor = { id: 'admin-1', role: Roles.SUPER_ADMIN };

      // Requesting 300 more when only 200 is available must be rejected
      await expect(
        paymentService.initiateRefund('payment-id-1', actor, {
          amount: 300,
          reason: 'CUSTOMER_REQUESTED'
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('Scenario 5: Payment Order Amount Validation', () => {
    it('should refuse to generate a payment order if booking payable amount is zero or negative', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        netPayableAmount: 0 // Invalid zero amount
      });
      jest.spyOn(paymentRepository, 'findActiveByBookingId').mockResolvedValue(null);

      await expect(
        paymentService.createPaymentOrder(mockCustomerId, { bookingId: mockBookingId })
      ).rejects.toThrow(AppError);
    });
  });
});
