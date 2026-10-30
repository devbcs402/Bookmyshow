export const BookingStatus = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
  PAYMENT_FAILED: 'FAILED'
});

export const BookingSeatStatus = Object.freeze({
  RESERVED: 'RESERVED',
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  RELEASED: 'RELEASED'
});

export const BookingDefaults = Object.freeze({
  DEFAULT_PAYMENT_WINDOW_SECONDS: 300,
  MAX_SEATS_PER_BOOKING: 10,
  MIN_SEATS_PER_BOOKING: 1,
  DEFAULT_TAX_PERCENT: 18.0,
  DEFAULT_CONVENIENCE_FEE: 30.0,
  CANCELLATION_CUTOFF_HOURS: 2,
  IDEMPOTENCY_TTL_SECONDS: 600
});

export const BookingRedisKeys = Object.freeze({
  IDEMPOTENCY_PREFIX: 'idempotency:booking',
  EXPIRATIONS_ZSET: 'bookings:expirations',
  EXPIRATION_LOCK_PREFIX: 'lock:expire:booking'
});

export const BookingSocketEvents = Object.freeze({
  SEAT_BOOKED: 'seat:booked',
  SEAT_RELEASED: 'seat:released',
  SEAT_EXPIRED: 'seat:expired',
  BOOKING_CREATED: 'booking:created',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_EXPIRED: 'booking:expired',
  AVAILABILITY_UPDATED: 'show:availability-updated'
});

export default {
  BookingStatus,
  BookingSeatStatus,
  BookingDefaults,
  BookingRedisKeys,
  BookingSocketEvents
};
