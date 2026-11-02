import { jest } from '@jest/globals';
import SeatLockService from '../../src/modules/seat-locks/seat-lock.service.js';
import seatLockRepository from '../../src/modules/seat-locks/seat-lock.repository.js';
import redisLockService from '../../src/modules/seat-locks/redis-lock.service.js';
import SeatLockSocket from '../../src/modules/seat-locks/seat-lock.socket.js';
import { SeatStatus } from '../../src/modules/screens/screen.constants.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';

describe('Seat Lock Concurrency & Multi-Seat Atomicity Tests', () => {
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c002';

  const userAContext = { id: 'user-a', role: 'CUSTOMER' };
  const userBContext = { id: 'user-b', role: 'CUSTOMER' };

  const seatA1 = '65f1a2b3c4d5e6f7a8b9c011';
  const seatA2 = '65f1a2b3c4d5e6f7a8b9c012';
  const seatA3 = '65f1a2b3c4d5e6f7a8b9c013';

  const mockShow = {
    _id: mockShowId,
    screenId: mockScreenId,
    layoutVersion: 1,
    status: ShowStatus.PUBLISHED,
    startTime: new Date(Date.now() + 86400000).toISOString(),
    isDeleted: false
  };

  const mockPhysicalSeats = [
    { _id: seatA1, status: SeatStatus.ACTIVE, isAvailable: true },
    { _id: seatA2, status: SeatStatus.ACTIVE, isAvailable: true },
    { _id: seatA3, status: SeatStatus.ACTIVE, isAvailable: true }
  ];

  beforeEach(() => {
    jest.spyOn(SeatLockSocket, 'emitSeatLocked').mockResolvedValue();
    jest.spyOn(SeatLockSocket, 'emitSeatReleased').mockResolvedValue();
    jest.spyOn(seatLockRepository, 'findShowById').mockResolvedValue(mockShow);
    jest.spyOn(seatLockRepository, 'findSeatsByIds').mockImplementation((_screenId, _v, ids) => {
      return Promise.resolve(mockPhysicalSeats.filter(s => ids.includes(s._id)));
    });
    jest.spyOn(seatLockRepository, 'findConflictingBookedSeats').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should enforce all-or-nothing atomicity: winner locks A1 and A2; loser fails completely leaving A3 free with zero partial locks', async () => {
    // Simulated in-memory Redis state mirroring Redis single-threaded Lua script atomicity
    const redisStore = new Map();

    jest
      .spyOn(redisLockService, 'acquireLocks')
      .mockImplementation(async (showId, seatIds, userId) => {
        // Step 1: Atomic conflict check for all requested keys
        const conflictingKeys = [];
        for (const seatId of seatIds) {
          const key = `seatlock:${showId}:${seatId}`;
          if (redisStore.has(key)) {
            conflictingKeys.push(seatId);
          }
        }

        // Step 2: If ANY seat is locked, reject entire batch (zero partial locks!)
        if (conflictingKeys.length > 0) {
          return {
            acquired: false,
            conflictingSeatIds: conflictingKeys
          };
        }

        // Step 3: All requested seats are free -> Atomically lock all
        const lockId = `lock-${userId}`;
        for (const seatId of seatIds) {
          const key = `seatlock:${showId}:${seatId}`;
          redisStore.set(key, { lockId, userId, seatId });
        }

        return {
          acquired: true,
          lockId,
          showId,
          seatIds,
          expiresAt: new Date(Date.now() + 300000),
          expiresInSeconds: 300
        };
      });

    // Customer A requests [A1, A2] simultaneously with Customer B requesting [A2, A3]
    const requestA = SeatLockService.acquireSeatLocks(
      { showId: mockShowId, seatIds: [seatA1, seatA2] },
      userAContext
    );

    const requestB = SeatLockService.acquireSeatLocks(
      { showId: mockShowId, seatIds: [seatA2, seatA3] },
      userBContext
    );

    const results = await Promise.allSettled([requestA, requestB]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Invariant 1: Exactly one succeeded and one failed
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Invariant 2: Failed operation returned 409 Conflict SEAT_ALREADY_LOCKED
    expect(rejected[0].reason.statusCode).toBe(409);
    expect(rejected[0].reason.errorCode).toBe('SEAT_ALREADY_LOCKED');
    expect(rejected[0].reason.details.conflictingSeatIds).toContain(seatA2);

    // Invariant 3: Zero partial locks in Redis store
    // Winner owns their two seats; Loser owns ZERO seats (A3 was NOT partially locked!)
    const winnerResult = fulfilled[0].value;
    if (winnerResult.lockId === 'lock-user-a') {
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA1}`)).toBe(true);
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA2}`)).toBe(true);
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA3}`)).toBe(false); // A3 is FREE!
    } else {
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA2}`)).toBe(true);
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA3}`)).toBe(true);
      expect(redisStore.has(`seatlock:${mockShowId}:${seatA1}`)).toBe(false); // A1 is FREE!
    }
  });

  it('should allow two non-overlapping requests to succeed concurrently', async () => {
    const redisStore = new Map();

    jest
      .spyOn(redisLockService, 'acquireLocks')
      .mockImplementation(async (showId, seatIds, userId) => {
        const lockId = `lock-${userId}`;
        for (const seatId of seatIds) {
          redisStore.set(`seatlock:${showId}:${seatId}`, { lockId, userId });
        }
        return {
          acquired: true,
          lockId,
          showId,
          seatIds,
          expiresAt: new Date(Date.now() + 300000),
          expiresInSeconds: 300
        };
      });

    // Customer A locks A1; Customer B locks A3 (disjoint seats)
    const requestA = SeatLockService.acquireSeatLocks(
      { showId: mockShowId, seatIds: [seatA1] },
      userAContext
    );

    const requestB = SeatLockService.acquireSeatLocks(
      { showId: mockShowId, seatIds: [seatA3] },
      userBContext
    );

    const results = await Promise.allSettled([requestA, requestB]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(2);
    expect(redisStore.size).toBe(2);
  });
});
