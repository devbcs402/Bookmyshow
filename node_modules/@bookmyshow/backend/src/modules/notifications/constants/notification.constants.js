export const NotificationChannel = Object.freeze({
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  IN_APP: 'IN_APP'
});

export const NotificationType = Object.freeze({
  // Authentication & Account
  AUTH_WELCOME: 'AUTH_WELCOME',
  AUTH_OTP: 'AUTH_OTP',
  AUTH_PASSWORD_CHANGED: 'AUTH_PASSWORD_CHANGED',
  AUTH_PASSWORD_RESET: 'AUTH_PASSWORD_RESET',

  // Booking Lifecycle
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
  SHOW_RESCHEDULED: 'SHOW_RESCHEDULED',
  SHOW_CANCELLED: 'SHOW_CANCELLED',
  TICKET_AVAILABLE: 'TICKET_AVAILABLE',

  // Payment & Refunds
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  REFUND_FAILED: 'REFUND_FAILED',

  // Theatre Management
  THEATRE_SUBMITTED: 'THEATRE_SUBMITTED',
  THEATRE_APPROVED: 'THEATRE_APPROVED',
  THEATRE_REJECTED: 'THEATRE_REJECTED',
  THEATRE_SUSPENDED: 'THEATRE_SUSPENDED',
  THEATRE_REACTIVATED: 'THEATRE_REACTIVATED',

  // Platform & Governance
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  SECURITY_ALERT: 'SECURITY_ALERT'
});

export const NotificationCategory = Object.freeze({
  TRANSACTIONAL: 'TRANSACTIONAL',
  MARKETING: 'MARKETING',
  SECURITY: 'SECURITY',
  SYSTEM: 'SYSTEM'
});

export const DeliveryStatus = Object.freeze({
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  PERMANENTLY_FAILED: 'PERMANENTLY_FAILED'
});

export const NotificationProvider = Object.freeze({
  MOCK_EMAIL: 'MOCK_EMAIL',
  SMTP: 'SMTP',
  RESEND: 'RESEND',
  MOCK_SMS: 'MOCK_SMS',
  TWILIO: 'TWILIO',
  FAST2SMS: 'FAST2SMS',
  MOCK_WHATSAPP: 'MOCK_WHATSAPP',
  WHATSAPP_CLOUD: 'WHATSAPP_CLOUD',
  IN_APP_DB: 'IN_APP_DB'
});

export const SupportedLanguages = Object.freeze({
  EN: 'en',
  HI: 'hi',
  GU: 'gu'
});

export const NotificationRedisKeys = Object.freeze({
  QUEUE_EMAIL: 'notifications:queue:email',
  QUEUE_SMS: 'notifications:queue:sms',
  QUEUE_WHATSAPP: 'notifications:queue:whatsapp',
  DELAYED_RETRIES_ZSET: 'notifications:delayed_retries',
  LOCK_PREFIX: 'notifications:lock',
  IDEMPOTENCY_PREFIX: 'notifications:idemp',
  DEAD_LETTER: 'notifications:dead_letter'
});

export const NotificationDefaults = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_SECONDS: 5,
  MAX_BACKOFF_SECONDS: 3600,
  DEFAULT_LANGUAGE: 'en',
  IN_APP_TTL_DAYS: 60,
  IDEMPOTENCY_TTL_SECONDS: 86400 // 24 hours deduplication window
});

export default {
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  DeliveryStatus,
  NotificationProvider,
  SupportedLanguages,
  NotificationRedisKeys,
  NotificationDefaults
};
