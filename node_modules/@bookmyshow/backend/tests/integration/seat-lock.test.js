import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import seatAvailabilityService from '../../src/modules/seat-locks/seat-availability.service.js';
import seatLockService from '../../src/modules/seat-locks/seat-lock.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';
import { AuthorizationError } from '../../src/common/errors/authorization.error.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';

describe('Seat Availability & Temporary Seat Locking Integration Tests', () => {
  let app;
  let customerToken;
  let otherCustomerToken;

  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockOtherCustomerId = '65f1a2b3c4d5e6f7a8b9c0c2';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0f1';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockSeatId1 = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockSeatId2 = '65f1a2b3c4d5e6f7a8b9c0a2';
  const mockLockId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

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
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
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

  /* =========================================================================
   * 1. GET /api/v1/shows/:showId/seats
   * ========================================================================= */
  describe('GET /api/v1/shows/:showId/seats', () => {
    it('should return 200 OK and show seat map for public customer', async () => {
      const mockAvailabilityData = {
        show: { id: mockShowId, status: 'PUBLISHED' },
        rows: [{ rowLabel: 'A', seats: [] }],
        stats: { totalSeats: 100, availableSeats: 90, lockedSeats: 10 }
      };

      jest
        .spyOn(seatAvailabilityService, 'getShowSeatAvailability')
        .mockResolvedValue(mockAvailabilityData);

      const res = await request(app).get(`/api/v1/shows/${mockShowId}/seats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalSeats).toBe(100);
      expect(seatAvailabilityService.getShowSeatAvailability).toHaveBeenCalledWith(
        mockShowId,
        null
      );
    });

    it('should pass authenticated userId to service when valid token is provided', async () => {
      jest.spyOn(seatAvailabilityService, 'getShowSeatAvailability').mockResolvedValue({
        show: { id: mockShowId },
        rows: [],
        stats: {}
      });

      const res = await request(app)
        .get(`/api/v1/shows/${mockShowId}/seats`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(seatAvailabilityService.getShowSeatAvailability).toHaveBeenCalledWith(
        mockShowId,
        mockCustomerId
      );
    });

    it('should return 400 Bad Request for malformed showId', async () => {
      const res = await request(app).get('/api/v1/shows/invalid-show-id/seats');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  /* =========================================================================
   * 2. POST /api/v1/shows/:showId/seat-locks
   * ========================================================================= */
  describe('POST /api/v1/shows/:showId/seat-locks', () => {
    it('should return 201 Created when seats are successfully locked', async () => {
      const mockResult = {
        lockId: mockLockId,
        showId: mockShowId,
        seatIds: [mockSeatId1, mockSeatId2],
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        expiresInSeconds: 300
      };

      jest.spyOn(seatLockService, 'acquireSeatLocks').mockResolvedValue(mockResult);

      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          seatIds: [mockSeatId1, mockSeatId2]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lockId).toBe(mockLockId);
      expect(res.body.data.seatIds).toHaveLength(2);
    });

    it('should return 401 Unauthorized when request lacks authentication token', async () => {
      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .send({ seatIds: [mockSeatId1] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 Bad Request when seatIds contains duplicates', async () => {
      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          seatIds: [mockSeatId1, mockSeatId1] // Duplicate!
        });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request when seatIds exceeds 10 seats ceiling', async () => {
      const excessSeats = Array.from(
        { length: 11 },
        (_, i) => `65f1a2b3c4d5e6f7a8b9c0${i.toString(16).padStart(2, '0')}`
      );

      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ seatIds: excessSeats });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 409 Conflict when seats are already held by another user', async () => {
      jest.spyOn(seatLockService, 'acquireSeatLocks').mockRejectedValue(
        new ConflictError(
          'One or more selected seats are temporarily held by another customer',
          ErrorCodes.SEAT_ALREADY_LOCKED,
          {
            conflictingSeatIds: [mockSeatId1]
          }
        )
      );

      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ seatIds: [mockSeatId1] });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('SEAT_ALREADY_LOCKED');
      expect(res.body.error.details.conflictingSeatIds).toContain(mockSeatId1);
    });

    it('should return 409 Conflict when seats are already booked in durable storage', async () => {
      jest.spyOn(seatLockService, 'acquireSeatLocks').mockRejectedValue(
        new ConflictError(
          'One or more selected seats are already confirmed or booked',
          ErrorCodes.SEAT_ALREADY_BOOKED,
          {
            conflictingSeatIds: [mockSeatId1]
          }
        )
      );

      const res = await request(app)
        .post(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ seatIds: [mockSeatId1] });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('SEAT_ALREADY_BOOKED');
    });
  });

  /* =========================================================================
   * 3. DELETE /api/v1/shows/:showId/seat-locks
   * ========================================================================= */
  describe('DELETE /api/v1/shows/:showId/seat-locks', () => {
    it('should return 200 OK when locks are successfully released', async () => {
      jest.spyOn(seatLockService, 'releaseSeatLocks').mockResolvedValue({
        released: true,
        releasedSeatIds: [mockSeatId1]
      });

      const res = await request(app)
        .delete(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          seatIds: [mockSeatId1],
          lockId: mockLockId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.releasedSeatIds).toContain(mockSeatId1);
    });

    it('should return 400 Bad Request when lockId is missing', async () => {
      const res = await request(app)
        .delete(`/api/v1/shows/${mockShowId}/seat-locks`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ seatIds: [mockSeatId1] });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  /* =========================================================================
   * 4. PATCH /api/v1/shows/:showId/seat-locks/renew
   * ========================================================================= */
  describe('PATCH /api/v1/shows/:showId/seat-locks/renew', () => {
    it('should return 200 OK with renewed expiration', async () => {
      const mockRenewResult = {
        lockId: mockLockId,
        showId: mockShowId,
        seatIds: [mockSeatId1],
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        expiresInSeconds: 300,
        renewalCount: 1
      };

      jest.spyOn(seatLockService, 'renewSeatLocks').mockResolvedValue(mockRenewResult);

      const res = await request(app)
        .patch(`/api/v1/shows/${mockShowId}/seat-locks/renew`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          seatIds: [mockSeatId1],
          lockId: mockLockId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.renewalCount).toBe(1);
    });

    it('should return 403 Forbidden when user does not own the lock', async () => {
      jest
        .spyOn(seatLockService, 'renewSeatLocks')
        .mockRejectedValue(
          new AuthorizationError(
            'Unauthorized: You do not own the locks for the specified seats',
            ErrorCodes.LOCK_OWNERSHIP_MISMATCH
          )
        );

      const res = await request(app)
        .patch(`/api/v1/shows/${mockShowId}/seat-locks/renew`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          seatIds: [mockSeatId1],
          lockId: mockLockId
        });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('LOCK_OWNERSHIP_MISMATCH');
    });

    it('should return 409 Conflict when lock has expired', async () => {
      jest
        .spyOn(seatLockService, 'renewSeatLocks')
        .mockRejectedValue(
          new ConflictError(
            'Seat locks have expired and cannot be renewed',
            ErrorCodes.LOCK_EXPIRED
          )
        );

      const res = await request(app)
        .patch(`/api/v1/shows/${mockShowId}/seat-locks/renew`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          seatIds: [mockSeatId1],
          lockId: mockLockId
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('LOCK_EXPIRED');
    });
  });
});
