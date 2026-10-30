import pino from 'pino';
import config from './env.js';

const isDev = config.NODE_ENV === 'development';

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.confirmPassword',
      'req.body.token',
      'req.body.refreshToken',
      'req.body.otp',
      'password',
      'token',
      'refreshToken',
      'otp',
      'secret'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

export default logger;

