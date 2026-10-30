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

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
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
