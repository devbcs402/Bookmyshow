import { z } from 'zod';

describe('Environment Configuration Unit Tests', () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().startsWith('/').default('/api/v1'),
    CLIENT_URL: z.string().url().default('http://localhost:3000'),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is mandatory'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is mandatory'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
  });

  it('should successfully validate valid environment variables', () => {
    const validEnv = {
      NODE_ENV: 'test',
      PORT: '5000',
      API_PREFIX: '/api/v1',
      CLIENT_URL: 'http://localhost:3000',
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      LOG_LEVEL: 'info'
    };

    const parsed = envSchema.safeParse(validEnv);
    expect(parsed.success).toBe(true);
    expect(parsed.data.PORT).toBe(5000);
    expect(parsed.data.NODE_ENV).toBe('test');
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
});
