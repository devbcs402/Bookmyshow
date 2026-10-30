export const SocketEvents = Object.freeze({
  // Connection lifecycle
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Show seat room events
  JOIN_SHOW_ROOM: 'show:join',
  LEAVE_SHOW_ROOM: 'show:leave',
  SEAT_LOCKED: 'seat:locked',
  SEAT_RELEASED: 'seat:released',
  SEAT_EXPIRED: 'seat:expired',
  SEAT_BOOKED: 'seat:booked',
  AVAILABILITY_UPDATED: 'show:availability-updated',

  // Booking lifecycle events
  BOOKING_CREATED: 'booking:created',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_EXPIRED: 'booking:expired',

  // Legacy/compatibility aliases
  SEATS_LOCKED: 'show:seats_locked',
  SEATS_RELEASED: 'show:seats_released',
  SEATS_BOOKED: 'show:seats_booked'
});

export default SocketEvents;
