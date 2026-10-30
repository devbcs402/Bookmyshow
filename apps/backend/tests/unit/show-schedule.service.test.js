import { jest } from '@jest/globals';
import ShowScheduleService from '../../src/modules/shows/show-schedule.service.js';
import redisConfig from '../../src/config/redis.js';
import { ConflictError } from '../../src/common/errors/conflict.error.js';

describe('ShowScheduleService Unit Tests', () => {
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0s1';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('acquireScreenLock', () => {
    it('should acquire lock when Redis is connected and key does not exist', async () => {
      const mockRedis = {
        status: 'ready',
        set: jest.fn().mockResolvedValue('OK')
      };
      jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis);

      const result = await ShowScheduleService.acquireScreenLock(mockScreenId, 10);
      expect(result.acquired).toBe(true);
      expect(result.token).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        `lock:schedule:screen:${mockScreenId}`,
        expect.any(String),
        'EX',
        10,
        'NX'
      );
    });

    it('should fail to acquire lock when key already exists in Redis', async () => {
      const mockRedis = {
        status: 'ready',
        set: jest.fn().mockResolvedValue(null)
      };
      jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis);

      const result = await ShowScheduleService.acquireScreenLock(mockScreenId, 10);
      expect(result.acquired).toBe(false);
      expect(result.token).toBeNull();
    });

    it('should fallback gracefully when Redis is disconnected', async () => {
      jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue({ status: 'end' });

      const result = await ShowScheduleService.acquireScreenLock(mockScreenId, 10);
      expect(result.acquired).toBe(true);
      expect(result.token).toBe('fallback-token');
    });
  });

  describe('releaseScreenLock', () => {
    it('should evaluate atomic Lua script to release lock', async () => {
      const mockRedis = {
        status: 'ready',
        eval: jest.fn().mockResolvedValue(1)
      };
      jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis);

      const released = await ShowScheduleService.releaseScreenLock(mockScreenId, 'test-token');
      expect(released).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should bypass Lua when token is fallback-token', async () => {
      const released = await ShowScheduleService.releaseScreenLock(mockScreenId, 'fallback-token');
      expect(released).toBe(true);
    });
  });

  describe('executeWithScheduleLock', () => {
    it('should execute task and release lock upon completion', async () => {
      jest.spyOn(ShowScheduleService, 'acquireScreenLock').mockResolvedValue({
        acquired: true,
        token: 'test-token'
      });
      const releaseSpy = jest
        .spyOn(ShowScheduleService, 'releaseScreenLock')
        .mockResolvedValue(true);

      const task = jest.fn().mockResolvedValue('task-result');
      const result = await ShowScheduleService.executeWithScheduleLock(mockScreenId, task);

      expect(result).toBe('task-result');
      expect(task).toHaveBeenCalled();
      expect(releaseSpy).toHaveBeenCalledWith(mockScreenId, 'test-token');
    });

    it('should throw ConflictError if lock cannot be acquired', async () => {
      jest.spyOn(ShowScheduleService, 'acquireScreenLock').mockResolvedValue({
        acquired: false,
        token: null
      });

      await expect(
        ShowScheduleService.executeWithScheduleLock(mockScreenId, jest.fn())
      ).rejects.toThrow(ConflictError);
    });
  });
});
