import {
  RedisRateLimitStore,
  createRateLimiter,
  authRateLimiter,
  otpRateLimiter,
  seatLockLimiter
} from '../../src/middlewares/rate-limit.middleware.js';

describe('Rate Limit Middleware & Store Unit Tests', () => {
  describe('RedisRateLimitStore (In-Memory Fallback)', () => {
    let store;

    beforeEach(() => {
      // Create store with disconnected client to test fallback
      store = new RedisRateLimitStore({
        prefix: 'test-rl',
        windowMs: 1000,
        redisClient: { status: 'disconnected' }
      });
    });

    it('should increment hits correctly in memory fallback', async () => {
      const res1 = await store.increment('user-ip-1');
      expect(res1.totalHits).toBe(1);
      expect(res1.resetTime).toBeInstanceOf(Date);

      const res2 = await store.increment('user-ip-1');
      expect(res2.totalHits).toBe(2);
    });

    it('should reset key properly', async () => {
      await store.increment('user-ip-2');
      await store.resetKey('user-ip-2');
      const res = await store.increment('user-ip-2');
      expect(res.totalHits).toBe(1);
    });
  });

  describe('Rate Limiter Instances', () => {
    it('should initialize authRateLimiter with valid function', () => {
      expect(typeof authRateLimiter).toBe('function');
    });

    it('should initialize otpRateLimiter with valid function', () => {
      expect(typeof otpRateLimiter).toBe('function');
    });

    it('should initialize seatLockLimiter with valid function', () => {
      expect(typeof seatLockLimiter).toBe('function');
    });

    it('should create custom limiter with custom max and windowMs', () => {
      const customLimiter = createRateLimiter({
        windowMs: 5000,
        max: 5,
        prefix: 'test-custom'
      });
      expect(typeof customLimiter).toBe('function');
    });
  });
});

