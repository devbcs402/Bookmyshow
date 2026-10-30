import { jest } from '@jest/globals';
import RedisLockService from '../../src/modules/seat-locks/redis-lock.service.js';
import redisConfig from '../../src/config/redis.js';

describe('RedisLockService Unit Tests', () => {
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      eval: jest.fn(),
      scan: jest.fn(),
      mget: jest.fn(),
      get: jest.fn(),
      set: jest.fn()
    };
    jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('acquireLocks', () => {
    it('should successfully acquire locks when all seats are free', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 'mock-lock-id']);

      const result = await RedisLockService.acquireLocks(
        'show-1',
        ['seat-1', 'seat-2'],
        'user-1',
        300
      );

      expect(result.acquired).toBe(true);
      expect(result.lockId).toBeDefined();
      expect(result.showId).toBe('show-1');
      expect(result.seatIds).toEqual(['seat-1', 'seat-2']);
      expect(result.expiresInSeconds).toBe(300);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockRedisClient.eval).toHaveBeenCalledTimes(1);
    });

    it('should reject acquisition when conflicting seats are locked', async () => {
      mockRedisClient.eval.mockResolvedValue([0, JSON.stringify(['seatlock:show-1:seat-2'])]);

      const result = await RedisLockService.acquireLocks('show-1', ['seat-1', 'seat-2'], 'user-1');

      expect(result.acquired).toBe(false);
      expect(result.conflictingSeatIds).toEqual(['seat-2']);
    });

    it('should throw 503 SERVICE_UNAVAILABLE when Redis client throws error', async () => {
      mockRedisClient.eval.mockRejectedValue(new Error('Connection lost to Redis'));

      await expect(
        RedisLockService.acquireLocks('show-1', ['seat-1'], 'user-1')
      ).rejects.toMatchObject({
        statusCode: 503,
        errorCode: 'SERVICE_UNAVAILABLE'
      });
    });
  });

  describe('releaseLocks', () => {
    it('should safely release caller-owned locks', async () => {
      mockRedisClient.eval.mockResolvedValue([1, JSON.stringify(['seatlock:show-1:seat-1'])]);

      const result = await RedisLockService.releaseLocks('show-1', ['seat-1'], 'lock-1', 'user-1');

      expect(result.released).toBe(true);
      expect(result.releasedSeatIds).toEqual(['seat-1']);
    });

    it('should handle idempotency when lock has already expired or released', async () => {
      mockRedisClient.eval.mockResolvedValue([1, JSON.stringify([])]);

      const result = await RedisLockService.releaseLocks('show-1', ['seat-1'], 'lock-1', 'user-1');

      expect(result.released).toBe(true);
      expect(result.releasedSeatIds).toEqual([]);
    });
  });

  describe('renewLocks', () => {
    it('should successfully extend lock TTL when valid', async () => {
      mockRedisClient.eval.mockResolvedValue([1, '1']);

      const result = await RedisLockService.renewLocks(
        'show-1',
        ['seat-1'],
        'lock-1',
        'user-1',
        300
      );

      expect(result.renewed).toBe(true);
      expect(result.renewalCount).toBe(1);
      expect(result.expiresInSeconds).toBe(300);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should return renewed: false with errorReason if lock expired', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 'LOCK_EXPIRED', 'seatlock:show-1:seat-1']);

      const result = await RedisLockService.renewLocks('show-1', ['seat-1'], 'lock-1', 'user-1');

      expect(result.renewed).toBe(false);
      expect(result.errorReason).toBe('LOCK_EXPIRED');
    });

    it('should return renewed: false with errorReason if ownership mismatches', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 'OWNERSHIP_MISMATCH', 'seatlock:show-1:seat-1']);

      const result = await RedisLockService.renewLocks('show-1', ['seat-1'], 'lock-1', 'attacker');

      expect(result.renewed).toBe(false);
      expect(result.errorReason).toBe('OWNERSHIP_MISMATCH');
    });

    it('should return renewed: false with errorReason if max renewals exceeded', async () => {
      mockRedisClient.eval.mockResolvedValue([
        0,
        'MAX_RENEWALS_EXCEEDED',
        'seatlock:show-1:seat-1'
      ]);

      const result = await RedisLockService.renewLocks('show-1', ['seat-1'], 'lock-1', 'user-1');

      expect(result.renewed).toBe(false);
      expect(result.errorReason).toBe('MAX_RENEWALS_EXCEEDED');
    });
  });

  describe('getActiveLocksForShow', () => {
    it('should scan and parse all active locks for a show', async () => {
      mockRedisClient.scan.mockResolvedValueOnce([
        '0',
        ['seatlock:show-1:seat-1', 'seatlock:show-1:seat-2']
      ]);
      mockRedisClient.mget.mockResolvedValue([
        JSON.stringify({
          lockId: 'l1',
          userId: 'u1',
          expiresAt: new Date(Date.now() + 60000).toISOString()
        }),
        JSON.stringify({
          lockId: 'l2',
          userId: 'u2',
          expiresAt: new Date(Date.now() + 120000).toISOString()
        })
      ]);

      const map = await RedisLockService.getActiveLocksForShow('show-1');

      expect(map.size).toBe(2);
      expect(map.get('seat-1').lockId).toBe('l1');
      expect(map.get('seat-2').userId).toBe('u2');
    });

    it('should return empty map when no locks exist for show', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      const map = await RedisLockService.getActiveLocksForShow('show-1');

      expect(map.size).toBe(0);
    });
  });

  describe('idempotency', () => {
    it('should return cached response if key exists', async () => {
      const mockRecord = {
        payloadToMatch: { showId: 'show-1', seatIds: ['seat-1'] },
        responseData: { lockId: 'lock-cached' }
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockRecord));

      const cached = await RedisLockService.checkIdempotency('user-1', 'idem-1');

      expect(cached).toEqual(mockRecord);
    });

    it('should save idempotency record with TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await RedisLockService.saveIdempotency(
        'user-1',
        'idem-1',
        { showId: 'show-1' },
        { lockId: 'lock-1' },
        600
      );

      expect(mockRedisClient.set).toHaveBeenCalledTimes(1);
    });
  });
});
