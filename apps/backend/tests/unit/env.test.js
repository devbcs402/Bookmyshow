import { envSchema } from '../../src/config/env.js';

describe('Environment Configuration Unit Tests', () => {
  it('should successfully validate valid environment variables with safe defaults', () => {
    const validEnv = {
      NODE_ENV: 'test',
      PORT: '5000',
      API_PREFIX: '/api/v1',
      CLIENT_URL: 'http://localhost:3000',
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      LOG_LEVEL: 'info',
      ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
      TRUST_PROXY: '1',
      COOKIE_SECURE: 'true',
      COOKIE_SAME_SITE: 'lax',
      ENABLE_SWAGGER: 'true',
      METRICS_ENABLED: 'true'
    };

    const parsed = envSchema.safeParse(validEnv);
    expect(parsed.success).toBe(true);
    expect(parsed.data.PORT).toBe(5000);
    expect(parsed.data.NODE_ENV).toBe('test');
    expect(parsed.data.TRUST_PROXY).toBe(1);
    expect(parsed.data.COOKIE_SECURE).toBe(true);
    expect(parsed.data.COOKIE_SAME_SITE).toBe('lax');
    expect(parsed.data.ENABLE_SWAGGER).toBe(true);
    expect(parsed.data.METRICS_ENABLED).toBe(true);
  });

  it('should reject when MONGODB_URI is missing', () => {
    const invalidEnv = {
      NODE_ENV: 'test',
      PORT: '5000',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456'
    };

    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
    expect(parsed.error.errors.some(e => e.path.includes('MONGODB_URI'))).toBe(true);
  });

  it('should reject when JWT_ACCESS_SECRET is shorter than 32 characters', () => {
    const invalidEnv = {
      NODE_ENV: 'test',
      PORT: '5000',
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'too_short_secret',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456'
    };

    const parsed = envSchema.safeParse(invalidEnv);
    expect(parsed.success).toBe(false);
    expect(parsed.error.errors.some(e => e.path.includes('JWT_ACCESS_SECRET'))).toBe(true);
  });

  it('should support explicit TRUST_PROXY, COOKIE_SECURE, and ENABLE_SWAGGER overrides', () => {
    const customEnv = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      COOKIE_SECURE: 'true',
      TRUST_PROXY: '1',
      ENABLE_SWAGGER: 'false',
      METRICS_ENABLED: 'false'
    };

    const parsed = envSchema.safeParse(customEnv);
    expect(parsed.success).toBe(true);
    expect(parsed.data.COOKIE_SECURE).toBe(true);
    expect(parsed.data.TRUST_PROXY).toBe(1);
    expect(parsed.data.ENABLE_SWAGGER).toBe(false);
    expect(parsed.data.METRICS_ENABLED).toBe(false);
  });
});
