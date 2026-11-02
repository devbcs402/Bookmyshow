export const SeatAvailabilityStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  LOCKED_BY_ME: 'LOCKED_BY_ME',
  LOCKED_BY_OTHER: 'LOCKED_BY_OTHER',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE'
});

export const SeatLockDefaults = Object.freeze({
  DEFAULT_TTL_SECONDS: 300,
  MIN_TTL_SECONDS: 60,
  MAX_TTL_SECONDS: 600,
  MAX_SEATS_PER_REQUEST: 10,
  MAX_LOCK_RENEWALS: 2,
  IDEMPOTENCY_TTL_SECONDS: 600
});

export const RedisKeyPrefix = Object.freeze({
  SEAT_LOCK: 'seatlock',
  USER_LOCKS: 'userlocks',
  IDEMPOTENCY: 'idempotency:seatlock',
  PUBSUB_CHANNEL: 'bms:show:events'
});

export const SocketEventNames = Object.freeze({
  JOIN_SHOW: 'show:join',
  LEAVE_SHOW: 'show:leave',
  SEAT_LOCKED: 'seat:locked',
  SEAT_RELEASED: 'seat:released',
  SEAT_EXPIRED: 'seat:expired',
  SEAT_BOOKED: 'seat:booked',
  AVAILABILITY_UPDATED: 'show:availability-updated'
});

export const BookingStatus = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED'
});

export default {
  SeatAvailabilityStatus,
  SeatLockDefaults,
  RedisKeyPrefix,
  SocketEventNames,
  BookingStatus
};
