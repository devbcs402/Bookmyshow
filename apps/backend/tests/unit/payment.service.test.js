import { jest } from '@jest/globals';
import paymentService from '../../src/modules/payments/payment.service.js';
import paymentRepository from '../../src/modules/payments/payment.repository.js';
import razorpayClient from '../../src/modules/payments/razorpay.client.js';
import PaymentSignatureService from '../../src/modules/payments/payment-signature.service.js';
import bookingRepository from '../../src/modules/bookings/booking.repository.js';
import bookingService from '../../src/modules/bookings/booking.service.js';
import { PaymentStatus, RefundStatus } from '../../src/modules/payments/payment.constants.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('PaymentService Unit Tests', () => {
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
    netPayableAmount: 535.4,
    status: BookingStatus.PENDING_PAYMENT,
    expiresAt: new Date(Date.now() + 300 * 1000),
    seats: [{ seatId: 'seat-1', seatLabel: 'A1' }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPaymentOrder', () => {
    it('should create a Razorpay order in paise for an eligible pending booking', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBookingDoc);
      jest.spyOn(paymentRepository, 'findActiveByBookingId').mockResolvedValue(null);

      jest.spyOn(razorpayClient, 'createOrder').mockResolvedValue({
        id: mockOrderId,
        amount: 53540,
        currency: 'INR'
      });

      jest.spyOn(paymentRepository, 'create').mockResolvedValue({
        _id: 'payment-doc-id-1',
        razorpayOrderId: mockOrderId,
        amount: 535.4,
        amountInPaise: 53540,
        currency: 'INR',
        status: PaymentStatus.PENDING
      });

      const result = await paymentService.createPaymentOrder(mockCustomerId, {
        bookingId: mockBookingId
      });

      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockOrderId);
      expect(result.amount).toBe(53540);
      expect(result.bookingReference).toBe('BK-20261030-XYZ789');
    });

    it('should throw NotFoundError if booking does not exist', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(null);

      await expect(
        paymentService.createPaymentOrder(mockCustomerId, { bookingId: mockBookingId })
      ).rejects.toThrow(AppError);
    });

    it('should throw NotFoundError if booking belongs to another customer (BOLA defense)', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        customerId: '65f1a2b3c4d5e6f7a8b9c999' // Different customer
      });

      await expect(
        paymentService.createPaymentOrder(mockCustomerId, { bookingId: mockBookingId })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if booking is not in PENDING_PAYMENT status', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.CONFIRMED
      });

      await expect(
        paymentService.createPaymentOrder(mockCustomerId, { bookingId: mockBookingId })
      ).rejects.toThrow(AppError);
    });

    it('should throw ConflictError if booking payment window has expired', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        expiresAt: new Date(Date.now() - 5000) // Expired 5 seconds ago
      });

      await expect(
        paymentService.createPaymentOrder(mockCustomerId, { bookingId: mockBookingId })
      ).rejects.toThrow(AppError);
    });

    it('should reuse existing active Razorpay order if one already exists for the booking', async () => {
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBookingDoc);

      const existingPayment = {
        _id: 'existing-payment-id',
        razorpayOrderId: 'order_ALREADY_EXISTS_123',
        amountInPaise: 53540,
        currency: 'INR',
        status: PaymentStatus.PENDING
      };
      jest.spyOn(paymentRepository, 'findActiveByBookingId').mockResolvedValue(existingPayment);
      const createOrderSpy = jest.spyOn(razorpayClient, 'createOrder');

      const result = await paymentService.createPaymentOrder(mockCustomerId, {
        bookingId: mockBookingId
      });

      expect(result.orderId).toBe('order_ALREADY_EXISTS_123');
      expect(createOrderSpy).not.toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('should confirm payment and booking upon valid cryptographic signature', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(true);

      const mockPaymentDoc = {
        _id: 'payment-id-1',
        bookingId: mockBookingId,
        customerId: mockCustomerId,
        razorpayOrderId: mockOrderId,
        status: PaymentStatus.PENDING,
        amount: 535.4
      };
      jest.spyOn(paymentRepository, 'findByOrderId').mockResolvedValue(mockPaymentDoc);
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBookingDoc);

      jest.spyOn(paymentRepository, 'update').mockResolvedValue({
        ...mockPaymentDoc,
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: mockPaymentId
      });

      jest.spyOn(bookingService, 'confirmBooking').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.CONFIRMED,
        bookingReference: 'BK-20261030-XYZ789'
      });

      const outcome = await paymentService.verifyPayment(mockCustomerId, {
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
        bookingId: mockBookingId
      });

      expect(outcome).toBeDefined();
      expect(outcome.payment.status).toBe(PaymentStatus.CAPTURED);
      expect(outcome.booking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw BadRequestError if HMAC signature does not match', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(false);

      await expect(
        paymentService.verifyPayment(mockCustomerId, {
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'invalid_forged_signature'
        })
      ).rejects.toThrow(AppError);
    });

    it('should return idempotent success if payment and booking are already confirmed', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(true);

      jest.spyOn(paymentRepository, 'findByOrderId').mockResolvedValue({
        _id: 'payment-id-1',
        bookingId: mockBookingId,
        customerId: mockCustomerId,
        status: PaymentStatus.CAPTURED,
        amount: 535.4,
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: mockPaymentId
      });

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.CONFIRMED
      });

      const confirmSpy = jest.spyOn(bookingService, 'confirmBooking');

      const outcome = await paymentService.verifyPayment(mockCustomerId, {
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature
      });

      expect(outcome.payment.status).toBe(PaymentStatus.CAPTURED);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('should flag payment as REFUND_REQUIRED if booking expired before verification arrived', async () => {
      jest.spyOn(PaymentSignatureService, 'verifyCheckoutSignature').mockReturnValue(true);

      const mockPaymentDoc = {
        _id: 'payment-id-1',
        bookingId: mockBookingId,
        customerId: mockCustomerId,
        razorpayOrderId: mockOrderId,
        status: PaymentStatus.PENDING,
        amount: 535.4
      };
      jest.spyOn(paymentRepository, 'findByOrderId').mockResolvedValue(mockPaymentDoc);
      jest.spyOn(bookingRepository, 'findById').mockResolvedValue({
        ...mockBookingDoc,
        status: BookingStatus.EXPIRED // Expired before verification
      });

      const updateSpy = jest.spyOn(paymentRepository, 'update').mockResolvedValue({
        ...mockPaymentDoc,
        status: PaymentStatus.CAPTURED,
        reconciliationStatus: 'REFUND_REQUIRED'
      });

      await expect(
        paymentService.verifyPayment(mockCustomerId, {
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature
        })
      ).rejects.toThrow(AppError);

      expect(updateSpy).toHaveBeenCalledWith(
        'payment-id-1',
        expect.objectContaining({
          reconciliationStatus: 'REFUND_REQUIRED'
        })
      );
    });
  });

  describe('initiateRefund', () => {
    it('should successfully initiate refund when authorized and balance permits', async () => {
      const mockPaymentDoc = {
        _id: 'payment-id-1',
        bookingId: mockBookingId,
        partnerId: mockPartnerId,
        status: PaymentStatus.CAPTURED,
        amount: 500,
        currency: 'INR',
        razorpayPaymentId: mockPaymentId
      };
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue(mockPaymentDoc);
      jest.spyOn(paymentRepository, 'getTotalRefundedAmount').mockResolvedValue(0);

      jest.spyOn(razorpayClient, 'createRefund').mockResolvedValue({
        id: 'rfnd_123456',
        amount: 50000,
        status: 'processed'
      });

      jest.spyOn(paymentRepository, 'createRefund').mockResolvedValue({
        _id: 'refund-id-1',
        razorpayRefundId: 'rfnd_123456',
        refundAmount: 500,
        status: RefundStatus.SUCCESS
      });

      jest.spyOn(paymentRepository, 'update').mockResolvedValue({
        ...mockPaymentDoc,
        status: PaymentStatus.REFUNDED
      });
      jest.spyOn(bookingRepository, 'updateStatus').mockResolvedValue({});

      const actor = { id: 'admin-1', role: Roles.SUPER_ADMIN };
      const result = await paymentService.initiateRefund('payment-id-1', actor, {
        amount: 500,
        reason: 'CUSTOMER_REQUESTED'
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(RefundStatus.SUCCESS);
    });

    it('should reject customer role from initiating arbitrary refunds', async () => {
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue({
        _id: 'payment-id-1',
        status: PaymentStatus.CAPTURED,
        amount: 500
      });

      const actor = { id: mockCustomerId, role: Roles.CUSTOMER };
      await expect(
        paymentService.initiateRefund('payment-id-1', actor, { amount: 500 })
      ).rejects.toThrow(AppError);
    });

    it('should reject refund if requested amount exceeds captured balance', async () => {
      jest.spyOn(paymentRepository, 'findById').mockResolvedValue({
        _id: 'payment-id-1',
        partnerId: mockPartnerId,
        status: PaymentStatus.CAPTURED,
        amount: 500
      });
      jest.spyOn(paymentRepository, 'getTotalRefundedAmount').mockResolvedValue(300); // 300 already refunded

      const actor = { id: 'admin-1', role: Roles.SUPER_ADMIN };
      // Attempt to refund 300 more when only 200 remains
      await expect(
        paymentService.initiateRefund('payment-id-1', actor, { amount: 300 })
      ).rejects.toThrow(AppError);
    });
  });
});

