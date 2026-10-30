import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default(''),

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

  // Security & Proxy Settings
  TRUST_PROXY: z
    .preprocess(val => {
      if (val === 'true' || val === true || val === '1') {
        return 1;
      }
      if (val === 'false' || val === false || val === '0') {
        return 0;
      }
      if (val !== undefined && !isNaN(Number(val))) {
        return Number(val);
      }
      return 0;
    }, z.number())
    .default(0),

  COOKIE_SECURE: z
    .preprocess(val => {
      if (val === 'true' || val === true) {
        return true;
      }
      if (val === 'false' || val === false) {
        return false;
      }
      return false;
    }, z.boolean())
    .default(false),

  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().default(''),

  ENABLE_SWAGGER: z
    .preprocess(val => {
      if (val === 'false' || val === false) {
        return false;
      }
      return true;
    }, z.boolean())
    .default(true),

  METRICS_ENABLED: z
    .preprocess(val => {
      if (val === 'false' || val === false) {
        return false;
      }
      return true;
    }, z.boolean())
    .default(true),

  INTERNAL_METRICS_TOKEN: z.string().default('bms_internal_metrics_secret_token_12345'),

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
  PAYMENT_ORDER_EXPIRY_MINUTES: z.coerce.number().int().min(1).max(120).default(15),

  // Notification Providers & Settings
  EMAIL_PROVIDER: z.enum(['mock', 'smtp', 'resend']).default('mock'),
  EMAIL_FROM_NAME: z.string().default('BookMyShow Support'),
  EMAIL_FROM_ADDRESS: z.string().default('no-reply@bookmyshow.example.com'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  RESEND_API_KEY: z.string().default(''),

  SMS_PROVIDER: z.enum(['mock', 'twilio', 'fast2sms']).default('mock'),
  SMS_SENDER_ID: z.string().default('BMSIND'),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_FROM_PHONE: z.string().default(''),
  FAST2SMS_API_KEY: z.string().default(''),

  WHATSAPP_PROVIDER: z.enum(['mock', 'whatsapp_cloud']).default('mock'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),

  NOTIFICATION_MAX_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  NOTIFICATION_RETRY_BACKOFF_SECONDS: z.coerce.number().int().min(1).max(3600).default(5)
});

export const parseConfig = (customEnv = process.env) => {
  const result = envSchema.safeParse(customEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('CRITICAL: Environment configuration validation failed:\n' + errorDetails);
    // In test environment, throw Error instead of exiting process so tests can assert failure
    if (customEnv.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') {
      throw new Error(`Environment validation failed: ${result.error.message}`);
    }
    process.exit(1);
  }

  return Object.freeze(result.data);
};

export const config = parseConfig();
export default config;
