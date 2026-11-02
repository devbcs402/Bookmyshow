import { jest } from '@jest/globals';
import SeatLockService from '../../src/modules/seat-locks/seat-lock.service.js';
import seatLockRepository from '../../src/modules/seat-locks/seat-lock.repository.js';
import redisLockService from '../../src/modules/seat-locks/redis-lock.service.js';
import SeatLockSocket from '../../src/modules/seat-locks/seat-lock.socket.js';
import { SeatStatus } from '../../src/modules/screens/screen.constants.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';

describe('SeatLockService Unit Tests', () => {
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c002';
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockUserContext = { id: mockUserId, role: 'CUSTOMER' };

  const futureStartTime = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

  const mockShow = {
    _id: mockShowId,
    screenId: mockScreenId,
    layoutVersion: 1,
    status: ShowStatus.PUBLISHED,
    startTime: futureStartTime,
    bookingClosesAt: null,
    isDeleted: false
  };

  const mockSeat1 = {
    _id: 'seat-1',
    status: SeatStatus.ACTIVE,
    isAvailable: true
  };
  const mockSeat2 = {
    _id: 'seat-2',
    status: SeatStatus.ACTIVE,
    isAvailable: true
  };

  beforeEach(() => {
    jest.spyOn(SeatLockSocket, 'emitSeatLocked').mockResolvedValue();
    jest.spyOn(SeatLockSocket, 'emitSeatReleased').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('acquireSeatLocks', () => {
    it('should successfully acquire locks for available seats', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(seatLockRepository, 'findSeatsByIds').mockResolvedValue([mockSeat1, mockSeat2]);
      jest.spyOn(seatLockRepository, 'findConflictingBookedSeats').mockResolvedValue([]);
      jest.spyOn(redisLockService, 'checkIdempotency').mockResolvedValue(null);
      jest.spyOn(redisLockService, 'acquireLocks').mockResolvedValue({
        acquired: true,
        lockId: 'lock-123',
        expiresAt: new Date(Date.now() + 300000),
        expiresInSeconds: 300
      });

      const result = await SeatLockService.acquireSeatLocks(
        { showId: mockShowId, seatIds: ['seat-1', 'seat-2'] },
        mockUserContext
      );

      expect(result.lockId).toBe('lock-123');
      expect(result.showId).toBe(mockShowId);
      expect(result.seatIds).toEqual(['seat-1', 'seat-2']);
      expect(SeatLockSocket.emitSeatLocked).toHaveBeenCalledWith(mockShowId, ['seat-1', 'seat-2']);
    });

    it('should return cached response on valid idempotency match', async () => {
      const cachedResponse = {
        lockId: 'cached-lock-id',
        showId: mockShowId,
        seatIds: ['seat-1']
      };
      jest.spyOn(redisLockService, 'checkIdempotency').mockResolvedValue({
        payloadToMatch: { showId: mockShowId, seatIds: ['seat-1'] },
        responseData: cachedResponse
      });

      const result = await SeatLockService.acquireSeatLocks(
        { showId: mockShowId, seatIds: ['seat-1'], idempotencyKey: 'idem-key' },
        mockUserContext
      );

      expect(result).toEqual(cachedResponse);
    });

    it('should throw ConflictError if idempotency key is reused with different payload', async () => {
      jest.spyOn(redisLockService, 'checkIdempotency').mockResolvedValue({
        payloadToMatch: { showId: mockShowId, seatIds: ['seat-1'] },
        responseData: {}
      });

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-2'], idempotencyKey: 'idem-key' },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'IDEMPOTENCY_CONFLICT'
      });
    });

    it('should reject when show is cancelled', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue({
        ...mockShow,
        status: ShowStatus.CANCELLED
      });

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'SHOW_ALREADY_CANCELLED'
      });
    });

    it('should reject when show has already started', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue({
        ...mockShow,
        startTime: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      });

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'SHOW_NOT_BOOKABLE'
      });
    });

    it('should reject when seat does not belong to show screen layout', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(seatLockRepository, 'findSeatsByIds').mockResolvedValue([]); // not found

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-invalid'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'SEAT_INVALID_FOR_SHOW'
      });
    });

    it('should reject when seat is physically blocked or under maintenance', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest
        .spyOn(seatLockRepository, 'findSeatsByIds')
        .mockResolvedValue([{ _id: 'seat-1', status: SeatStatus.MAINTENANCE, isAvailable: false }]);

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'SEAT_UNAVAILABLE'
      });
    });

    it('should reject when seat is already booked in MongoDB durable records', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(seatLockRepository, 'findSeatsByIds').mockResolvedValue([mockSeat1]);
      jest.spyOn(seatLockRepository, 'findConflictingBookedSeats').mockResolvedValue(['seat-1']);

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'SEAT_ALREADY_BOOKED'
      });
    });

    it('should reject when seat is already held in Redis by another customer', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(seatLockRepository, 'findSeatsByIds').mockResolvedValue([mockSeat1]);
      jest.spyOn(seatLockRepository, 'findConflictingBookedSeats').mockResolvedValue([]);
      jest.spyOn(redisLockService, 'checkIdempotency').mockResolvedValue(null);
      jest.spyOn(redisLockService, 'acquireLocks').mockResolvedValue({
        acquired: false,
        conflictingSeatIds: ['seat-1']
      });

      await expect(
        SeatLockService.acquireSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'] },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'SEAT_ALREADY_LOCKED'
      });
    });
  });

  describe('releaseSeatLocks', () => {
    it('should release seat locks and broadcast real-time availability event', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(redisLockService, 'releaseLocks').mockResolvedValue({
        released: true,
        releasedSeatIds: ['seat-1']
      });

      const result = await SeatLockService.releaseSeatLocks(
        { showId: mockShowId, seatIds: ['seat-1'], lockId: 'lock-1' },
        mockUserContext
      );

      expect(result.released).toBe(true);
      expect(SeatLockSocket.emitSeatReleased).toHaveBeenCalledWith(mockShowId, ['seat-1']);
    });
  });

  describe('renewSeatLocks', () => {
    it('should successfully renew lock duration', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(redisLockService, 'renewLocks').mockResolvedValue({
        renewed: true,
        renewalCount: 1,
        expiresAt: new Date(Date.now() + 300000),
        expiresInSeconds: 300
      });

      const result = await SeatLockService.renewSeatLocks(
        { showId: mockShowId, seatIds: ['seat-1'], lockId: 'lock-1' },
        mockUserContext
      );

      expect(result.renewalCount).toBe(1);
      expect(result.lockId).toBe('lock-1');
    });

    it('should throw ConflictError if lock has expired', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(redisLockService, 'renewLocks').mockResolvedValue({
        renewed: false,
        errorReason: 'LOCK_EXPIRED'
      });

      await expect(
        SeatLockService.renewSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'], lockId: 'lock-1' },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'LOCK_EXPIRED'
      });
    });

    it('should throw AuthorizationError if user does not own the lock', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(redisLockService, 'renewLocks').mockResolvedValue({
        renewed: false,
        errorReason: 'OWNERSHIP_MISMATCH'
      });

      await expect(
        SeatLockService.renewSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'], lockId: 'lock-1' },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: 'LOCK_OWNERSHIP_MISMATCH'
      });
    });

    it('should throw ConflictError if renewal limit reached', async () => {
      jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
      jest.spyOn(redisLockService, 'renewLocks').mockResolvedValue({
        renewed: false,
        errorReason: 'MAX_RENEWALS_EXCEEDED'
      });

      await expect(
        SeatLockService.renewSeatLocks(
          { showId: mockShowId, seatIds: ['seat-1'], lockId: 'lock-1' },
          mockUserContext
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: 'LOCK_LIMIT_EXCEEDED'
      });
    });
  });
});
