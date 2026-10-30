import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is mandatory'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is mandatory'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long for security'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long for security'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  SEAT_LOCK_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
  MAX_SEATS_PER_LOCK: z.coerce.number().int().min(1).max(10).default(10),
  MAX_LOCK_RENEWALS: z.coerce.number().int().min(0).max(5).default(2),

  BOOKING_PAYMENT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  DEFAULT_CONVENIENCE_FEE: z.coerce.number().min(0).default(30.0),
  DEFAULT_TAX_PERCENT: z.coerce.number().min(0).default(18.0),
  BOOKING_CANCELLATION_CUTOFF_HOURS: z.coerce.number().min(0).default(2),

  RAZORPAY_KEY_ID: z.string().default('rzp_test_mockKeyId12345678'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_mockSecret12345678'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_mock_123456'),
  RAZORPAY_CURRENCY: z.string().default('INR'),
  PAYMENT_ORDER_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(120).default(15)
});

const parseConfig = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('CRITICAL: Environment configuration validation failed:\n' + errorDetails);
    // In test environment, throw Error instead of exiting process so tests can assert failure
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Environment validation failed: ${result.error.message}`);
    }
    process.exit(1);
  }

  return Object.freeze(result.data);
};

export const config = parseConfig();
export default config;
