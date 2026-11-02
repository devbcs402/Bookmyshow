import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import paymentService from '../../src/modules/payments/payment.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { AppError } from '../../src/common/errors/app.error.js';
import HttpStatus from '../../src/common/constants/http-status.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';
import { PaymentStatus, RefundStatus } from '../../src/modules/payments/payment.constants.js';

describe('Payment Module Integration Tests', () => {
  let app;
  let customerToken;
  let ownerToken;

  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0e1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0f1';
  const mockBookingId = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockPaymentId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const mockOrderId = 'order_DBJOWzybf0sJbb';

  beforeAll(() => {
    app = createApp();

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockOwnerId) {
        return Promise.resolve({
          _id: mockOwnerId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerId,
          isActive: true
        });
      }
      return Promise.resolve({
        _id: userId,
        role: Roles.CUSTOMER,
        isActive: true
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/payments/create-order', () => {
    it('should create Razorpay order with 201 Created for authenticated customer', async () => {
      const mockOrderResponse = {
        keyId: 'rzp_test_mockKeyId12345678',
        orderId: mockOrderId,
        amount: 50000,
        currency: 'INR',
        bookingReference: 'BK-20261030-XYZ789',
        bookingId: mockBookingId,
        paymentId: mockPaymentId
      };

      jest.spyOn(paymentService, 'createPaymentOrder').mockResolvedValue(mockOrderResponse);

      const response = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: mockBookingId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(mockOrderId);
      expect(response.body.data.amount).toBe(50000);
    });

    it('should return 401 Unauthorized when request lacks authentication token', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create-order')
        .send({ bookingId: mockBookingId });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 Bad Request when bookingId is not a valid ObjectId', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: 'invalid-id' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should return 404 Not Found when booking does not exist', async () => {
      jest
        .spyOn(paymentService, 'createPaymentOrder')
        .mockRejectedValue(
          new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND)
        );

      const response = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: mockBookingId });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe(ErrorCodes.BOOKING_NOT_FOUND);
    });

    it('should return 409 Conflict when booking has expired', async () => {
      jest
        .spyOn(paymentService, 'createPaymentOrder')
        .mockRejectedValue(
          new AppError(
            'Booking checkout window has expired',
            HttpStatus.CONFLICT,
            ErrorCodes.BOOKING_ALREADY_EXPIRED
          )
        );

      const response = await request(app)
        .post('/api/v1/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: mockBookingId });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe(ErrorCodes.BOOKING_ALREADY_EXPIRED);
    });
  });

  describe('POST /api/v1/payments/verify', () => {
    it('should return 200 OK and confirmed booking upon valid signature', async () => {
      const mockVerifyResponse = {
        payment: {
          id: mockPaymentId,
          orderId: mockOrderId,
          status: PaymentStatus.CAPTURED,
          amount: 500
        },
        booking: {
          id: mockBookingId,
          status: 'CONFIRMED',
          bookingReference: 'BK-20261030-XYZ789'
        }
      };

      jest.spyOn(paymentService, 'verifyPayment').mockResolvedValue(mockVerifyResponse);

      const response = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: 'pay_29QQoUBi66xm2f',
          razorpay_signature: '9ef426ebf606b111a62d53a330070e36e4bb9a0ef44979f8295b882ac377ac82'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.booking.status).toBe('CONFIRMED');
    });

    it('should return 400 Bad Request when signature is forged', async () => {
      jest
        .spyOn(paymentService, 'verifyPayment')
        .mockRejectedValue(
          new AppError(
            'Payment verification failed: cryptographic signature mismatch',
            HttpStatus.BAD_REQUEST,
            ErrorCodes.INVALID_PAYMENT_SIGNATURE
          )
        );

      const response = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: 'pay_29QQoUBi66xm2f',
          razorpay_signature: 'forged_signature_123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ErrorCodes.INVALID_PAYMENT_SIGNATURE);
    });
  });

  describe('POST /api/v1/payments/webhook/razorpay', () => {
    it('should return 200 OK when valid webhook event is received', async () => {
      jest.spyOn(paymentService, 'processWebhook').mockResolvedValue({
        status: 'processed',
        eventId: 'evt_123456',
        event: 'payment.captured'
      });

      const response = await request(app)
        .post('/api/v1/payments/webhook/razorpay')
        .set('x-razorpay-signature', 'valid_signature_hex')
        .set('x-razorpay-event-id', 'evt_123456')
        .send({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_123' } } }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processed');
    });

    it('should return 400 Bad Request when webhook signature is invalid', async () => {
      jest
        .spyOn(paymentService, 'processWebhook')
        .mockRejectedValue(
          new AppError(
            'Invalid webhook signature',
            HttpStatus.BAD_REQUEST,
            ErrorCodes.INVALID_WEBHOOK_SIGNATURE
          )
        );

      const response = await request(app)
        .post('/api/v1/payments/webhook/razorpay')
        .set('x-razorpay-signature', 'invalid_sig')
        .send({ event: 'payment.captured' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ErrorCodes.INVALID_WEBHOOK_SIGNATURE);
    });

    it('should return 200 OK with ignored_duplicate on duplicate webhook delivery', async () => {
      jest.spyOn(paymentService, 'processWebhook').mockResolvedValue({
        status: 'ignored_duplicate',
        eventId: 'evt_123456',
        event: 'payment.captured'
      });

      const response = await request(app)
        .post('/api/v1/payments/webhook/razorpay')
        .set('x-razorpay-signature', 'valid_sig')
        .set('x-razorpay-event-id', 'evt_123456')
        .send({ event: 'payment.captured' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ignored_duplicate');
    });
  });

  describe('GET /api/v1/payments/:paymentId', () => {
    it('should return payment details for authenticated customer', async () => {
      jest.spyOn(paymentService, 'getPaymentDetails').mockResolvedValue({
        _id: mockPaymentId,
        bookingId: mockBookingId,
        amount: 500,
        status: PaymentStatus.CAPTURED,
        refunds: []
      });

      const response = await request(app)
        .get(`/api/v1/payments/${mockPaymentId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(PaymentStatus.CAPTURED);
    });

    it('should return 404 when payment does not exist', async () => {
      jest
        .spyOn(paymentService, 'getPaymentDetails')
        .mockRejectedValue(
          new AppError('Payment not found', HttpStatus.NOT_FOUND, ErrorCodes.PAYMENT_NOT_FOUND)
        );

      const response = await request(app)
        .get(`/api/v1/payments/${mockPaymentId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe(ErrorCodes.PAYMENT_NOT_FOUND);
    });
  });

  describe('GET /api/v1/bookings/:bookingId/payments', () => {
    it('should return payment history for a booking', async () => {
      jest.spyOn(paymentService, 'getBookingPayments').mockResolvedValue([
        {
          _id: mockPaymentId,
          bookingId: mockBookingId,
          amount: 500,
          status: PaymentStatus.CAPTURED
        }
      ]);

      const response = await request(app)
        .get(`/api/v1/bookings/${mockBookingId}/payments`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('POST /api/v1/payments/:paymentId/refunds', () => {
    it('should initiate refund successfully when authorized by theatre owner', async () => {
      jest.spyOn(paymentService, 'initiateRefund').mockResolvedValue({
        _id: 'refund-123',
        paymentId: mockPaymentId,
        refundAmount: 500,
        status: RefundStatus.SUCCESS
      });

      const response = await request(app)
        .post(`/api/v1/payments/${mockPaymentId}/refunds`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 500,
          reason: 'CUSTOMER_REQUESTED'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.refundAmount).toBe(500);
    });

    it('should reject customer role with 403 Forbidden', async () => {
      const response = await request(app)
        .post(`/api/v1/payments/${mockPaymentId}/refunds`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 500
        });

      expect(response.status).toBe(403);
    });
  });
});
