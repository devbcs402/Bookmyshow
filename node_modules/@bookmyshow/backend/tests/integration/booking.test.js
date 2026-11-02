import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import bookingService from '../../src/modules/bookings/booking.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles, Permissions } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { AppError } from '../../src/common/errors/app.error.js';
import HttpStatus from '../../src/common/constants/http-status.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';

describe('Booking Engine Integration Tests', () => {
  let app;
  let customerToken;
  let otherCustomerToken;
  let ownerToken;

  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockOtherCustomerId = '65f1a2b3c4d5e6f7a8b9c0c2';
  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0e1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0f1';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockSeatId1 = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockSeatId2 = '65f1a2b3c4d5e6f7a8b9c0a2';
  const mockBookingId = '65f1a2b3c4d5e6f7a8b9c0b1';

  beforeAll(() => {
    app = createApp();

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });

    otherCustomerToken = generateAccessToken({
      userId: mockOtherCustomerId,
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
          isActive: true,
          permissions: [Permissions.BOOKING_READ, Permissions.BOOKING_CANCEL]
        });
      }
      return Promise.resolve({
        _id: userId,
        role: Roles.CUSTOMER,
        isActive: true,
        permissions: [Permissions.BOOKING_READ, Permissions.BOOKING_CANCEL]
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/bookings', () => {
    it('should successfully create a pending-payment booking with valid seat locks', async () => {
      const mockCreatedBooking = {
        _id: mockBookingId,
        bookingReference: 'BK-20261030-9K8L2P',
        customerId: mockCustomerId,
        showId: mockShowId,
        status: BookingStatus.PENDING_PAYMENT,
        totalSeats: 2,
        baseAmount: 1000,
        convenienceFee: 60,
        taxAmount: 10.8,
        netPayableAmount: 1070.8,
        seats: [
          { seatId: mockSeatId1, seatLabel: 'A1', unitPrice: 535.4 },
          { seatId: mockSeatId2, seatLabel: 'A2', unitPrice: 535.4 }
        ],
        qrCodePayload: 'BMS-QR.mockClaims.mockSignature',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };

      jest.spyOn(bookingService, 'createBooking').mockResolvedValue(mockCreatedBooking);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showId: mockShowId,
          seatIds: [mockSeatId1, mockSeatId2]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingReference).toBe('BK-20261030-9K8L2P');
      expect(res.body.data.status).toBe(BookingStatus.PENDING_PAYMENT);
      expect(res.body.data.netPayableAmount).toBe(1070.8);
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        mockCustomerId,
        { showId: mockShowId, seatIds: [mockSeatId1, mockSeatId2] },
        null
      );
    });

    it('should pass idempotency key header to booking service', async () => {
      const mockCreatedBooking = {
        _id: mockBookingId,
        bookingReference: 'BK-20261030-IDEMPOTENT',
        status: BookingStatus.PENDING_PAYMENT
      };

      jest.spyOn(bookingService, 'createBooking').mockResolvedValue(mockCreatedBooking);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', 'unique-checkout-token-123')
        .send({
          showId: mockShowId,
          seatIds: [mockSeatId1]
        });

      expect(res.status).toBe(201);
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        mockCustomerId,
        { showId: mockShowId, seatIds: [mockSeatId1] },
        'unique-checkout-token-123'
      );
    });

    it('should reject with 401 Unauthorized when request lacks bearer token', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          showId: mockShowId,
          seatIds: [mockSeatId1]
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject with 400 Bad Request when seatIds array is empty', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showId: mockShowId,
          seatIds: []
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject with 400 Bad Request when seatIds exceeds 10 ceiling', async () => {
      const elevenSeats = Array.from(
        { length: 11 },
        (_, i) => `65f1a2b3c4d5e6f7a8b9c0${i.toString(16).padStart(2, '0')}`
      );

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showId: mockShowId,
          seatIds: elevenSeats
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 Conflict when seat lock has expired', async () => {
      jest
        .spyOn(bookingService, 'createBooking')
        .mockRejectedValue(
          new AppError(
            'Seat lock has expired or does not exist',
            HttpStatus.CONFLICT,
            ErrorCodes.LOCK_EXPIRED
          )
        );

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showId: mockShowId,
          seatIds: [mockSeatId1]
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.LOCK_EXPIRED);
    });

    it('should return 403 Forbidden when seat lock belongs to another user', async () => {
      jest
        .spyOn(bookingService, 'createBooking')
        .mockRejectedValue(
          new AppError(
            'Seat lock belongs to another user',
            HttpStatus.FORBIDDEN,
            ErrorCodes.LOCK_OWNERSHIP_MISMATCH
          )
        );

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showId: mockShowId,
          seatIds: [mockSeatId1]
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.LOCK_OWNERSHIP_MISMATCH);
    });
  });

  describe('GET /api/v1/bookings/:bookingId', () => {
    it('should return booking details for the authenticated owner', async () => {
      const mockBooking = {
        _id: mockBookingId,
        bookingReference: 'BK-20261030-9K8L2P',
        customerId: mockCustomerId,
        status: BookingStatus.PENDING_PAYMENT,
        ticketView: {
          bookingReference: 'BK-20261030-9K8L2P',
          status: BookingStatus.PENDING_PAYMENT
        }
      };

      jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking);

      const res = await request(app)
        .get(`/api/v1/bookings/${mockBookingId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingReference).toBe('BK-20261030-9K8L2P');
    });

    it('should return 404 when customer tries to access another users booking (BOLA protection)', async () => {
      jest
        .spyOn(bookingService, 'getBookingById')
        .mockRejectedValue(
          new AppError(
            'Booking not found under your account',
            HttpStatus.NOT_FOUND,
            ErrorCodes.BOOKING_NOT_FOUND
          )
        );

      const res = await request(app)
        .get(`/api/v1/bookings/${mockBookingId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.BOOKING_NOT_FOUND);
    });
  });

  describe('GET /api/v1/users/me/bookings', () => {
    it('should return paginated booking history for customer', async () => {
      jest.spyOn(bookingService, 'getCustomerBookings').mockResolvedValue({
        bookings: [
          {
            _id: mockBookingId,
            bookingReference: 'BK-20261030-9K8L2P',
            status: BookingStatus.CONFIRMED
          }
        ],
        total: 1
      });

      const res = await request(app)
        .get('/api/v1/users/me/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.totalRecords).toBe(1);
    });
  });

  describe('POST /api/v1/bookings/:bookingId/cancel', () => {
    it('should cancel eligible booking successfully', async () => {
      const cancelledBooking = {
        _id: mockBookingId,
        bookingReference: 'BK-20261030-9K8L2P',
        status: BookingStatus.CANCELLED
      };

      jest.spyOn(bookingService, 'cancelBooking').mockResolvedValue(cancelledBooking);

      const res = await request(app)
        .post(`/api/v1/bookings/${mockBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Customer requested cancellation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('GET /api/v1/owner/bookings', () => {
    it('should allow theatre owner to view bookings for their organization', async () => {
      jest.spyOn(bookingService, 'getPartnerBookings').mockResolvedValue({
        bookings: [
          {
            _id: mockBookingId,
            partnerId: mockPartnerId,
            status: BookingStatus.CONFIRMED
          }
        ],
        total: 1
      });

      const res = await request(app)
        .get('/api/v1/owner/bookings')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should deny customer access to theatre owner bookings with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/owner/bookings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
