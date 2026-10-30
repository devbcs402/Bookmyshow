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

describe('Booking Multi-Tenant Isolation & BOLA Tests', () => {
  let app;
  let ownerAToken;
  let ownerBToken;

  const mockOwnerA = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockPartnerA = '65f1a2b3c4d5e6f7a8b9c011';
  const mockOwnerB = '65f1a2b3c4d5e6f7a8b9c0b1';
  const mockPartnerB = '65f1a2b3c4d5e6f7a8b9c022';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0f1';
  const mockBookingPartnerA = '65f1a2b3c4d5e6f7a8b9c099';

  beforeAll(() => {
    app = createApp();

    ownerAToken = generateAccessToken({
      userId: mockOwnerA,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerA
    });

    ownerBToken = generateAccessToken({
      userId: mockOwnerB,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerB
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockOwnerA) {
        return Promise.resolve({
          _id: mockOwnerA,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerA,
          isActive: true,
          permissions: [Permissions.BOOKING_READ, Permissions.BOOKING_CANCEL]
        });
      }
      return Promise.resolve({
        _id: mockOwnerB,
        role: Roles.THEATRE_OWNER,
        partnerId: mockPartnerB,
        isActive: true,
        permissions: [Permissions.BOOKING_READ, Permissions.BOOKING_CANCEL]
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Owner B cannot view details of a booking belonging to Owner A cinema', async () => {
    jest.spyOn(bookingService, 'getBookingById').mockImplementation((bookingId, user) => {
      if (user.partnerId === mockPartnerB) {
        throw new AppError(
          'Booking not found under your cinema organization',
          HttpStatus.NOT_FOUND,
          ErrorCodes.BOOKING_NOT_FOUND
        );
      }
      return Promise.resolve({
        _id: bookingId,
        partnerId: mockPartnerA,
        bookingReference: 'BK-CINEMA-A'
      });
    });

    const res = await request(app)
      .get(`/api/v1/bookings/${mockBookingPartnerA}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCodes.BOOKING_NOT_FOUND);
  });

  it('Owner B cannot cancel a booking belonging to Owner A cinema', async () => {
    jest.spyOn(bookingService, 'cancelBooking').mockImplementation((bookingId, user) => {
      if (user.partnerId === mockPartnerB) {
        throw new AppError(
          'Booking not found under your organization',
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
      return Promise.resolve({
        _id: bookingId,
        status: 'CANCELLED'
      });
    });

    const res = await request(app)
      .post(`/api/v1/bookings/${mockBookingPartnerA}/cancel`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ reason: 'Malicious cancellation' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it('Owner A can view details of bookings belonging to their own cinema', async () => {
    jest.spyOn(bookingService, 'getBookingById').mockResolvedValue({
      _id: mockBookingPartnerA,
      partnerId: mockPartnerA,
      bookingReference: 'BK-CINEMA-A'
    });

    const res = await request(app)
      .get(`/api/v1/bookings/${mockBookingPartnerA}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingReference).toBe('BK-CINEMA-A');
  });
});
