import pino from 'pino';
import config from './env.js';

const isDev = config.NODE_ENV === 'development';

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-razorpay-signature"]',
      'req.headers["x-webhook-signature"]',
      'req.body.password',
      'req.body.confirmPassword',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.token',
      'req.body.refreshToken',
      'req.body.otp',
      'req.body.cvv',
      'req.body.cardNumber',
      'req.body.upiPin',
      'req.body.razorpay_signature',
      'req.body.razorpay_payment_id',
      'password',
      'confirmPassword',
      'currentPassword',
      'newPassword',
      'token',
      'refreshToken',
      'otp',
      'secret',
      'cvv',
      'cardNumber',
      'upiPin',
      'razorpay_signature'
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
