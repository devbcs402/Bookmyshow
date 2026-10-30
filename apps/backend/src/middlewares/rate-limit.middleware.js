import rateLimit from 'express-rate-limit';
import config from '../config/env.js';
import HttpStatus from '../common/constants/http-status.js';
import ErrorCodes from '../common/constants/error-codes.js';
import ApiResponse from '../common/responses/api-response.js';
import { getRedisClient } from '../config/redis.js';

export class RedisRateLimitStore {
  constructor({ prefix = 'rl', windowMs = 60000, redisClient = null } = {}) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.client = redisClient || null;
    this.memoryMap = new Map();
  }

  getClient() {
    if (!this.client) {
      try {
        this.client = getRedisClient();
      } catch (_) {
        this.client = null;
      }
    }
    return this.client;
  }

  async increment(key) {
    const client = this.getClient();

    if (!client || client.status !== 'ready') {
      return this.memoryIncrement(key);
    }

    try {
      const redisKey = `${this.prefix}:${key}`;
      const script = `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('PEXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('PTTL', KEYS[1])
        return {current, ttl}
      `;
      const [current, ttl] = await client.eval(script, 1, redisKey, this.windowMs);
      const resetTime = new Date(Date.now() + Math.max(0, Number(ttl)));
      return { totalHits: Number(current), resetTime };
    } catch (_err) {
      return this.memoryIncrement(key);
    }
  }

  async decrement(key) {
    const client = this.getClient();
    if (client && client.status === 'ready') {
      try {
        await client.decr(`${this.prefix}:${key}`);
      } catch (_err) {
        // Ignore decrement errors on shutdown
      }
    }
  }

  async resetKey(key) {
    const client = this.getClient();
    if (client && client.status === 'ready') {
      try {
        await client.del(`${this.prefix}:${key}`);
      } catch (_err) {
        // Ignore deletion errors on shutdown
      }
    }
    this.memoryMap.delete(key);
  }

  memoryIncrement(key) {
    const now = Date.now();
    let record = this.memoryMap.get(key);
    if (!record || record.resetTime <= now) {
      record = { totalHits: 1, resetTime: now + this.windowMs };
    } else {
      record.totalHits += 1;
    }
    this.memoryMap.set(key, record);
    return { totalHits: record.totalHits, resetTime: new Date(record.resetTime) };
  }
}

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.',
  prefix = 'rl:default',
  keyGenerator = null
} = {}) => {
  const isTest = config.NODE_ENV === 'test';
  return rateLimit({
    windowMs,
    max: isTest ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || undefined,
    store: isTest ? undefined : new RedisRateLimitStore({ prefix, windowMs }),
    handler: (req, res) => {
      return ApiResponse.error(res, {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
        requestId: req.id
      });
    }
  });
};

export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  prefix: 'rl:global',
  message: 'Global rate limit exceeded. Please wait a few minutes.'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  prefix: 'rl:auth',
  message: 'Too many authentication attempts. Please wait 15 minutes.'
});

export const otpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  prefix: 'rl:otp',
  message: 'Too many OTP requests. Please wait 10 minutes.'
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'rl:pwreset',
  message: 'Too many password reset attempts. Please wait 15 minutes.'
});

export const seatLockLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: 'rl:seatlock',
  message: 'Too many seat locking attempts. Please wait a minute.'
});

export const bookingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: 'rl:booking',
  message: 'Too many booking requests. Please wait a minute.'
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  prefix: 'rl:payment',
  message: 'Too many payment requests. Please wait a minute.'
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  prefix: 'rl:search',
  message: 'Search query rate limit exceeded. Please slow down.'
});

export default {
  createRateLimiter,
  globalRateLimiter,
  authRateLimiter,
  otpRateLimiter,
  passwordResetLimiter,
  seatLockLimiter,
  bookingLimiter,
  paymentLimiter,
  searchRateLimiter,
  RedisRateLimitStore
};
