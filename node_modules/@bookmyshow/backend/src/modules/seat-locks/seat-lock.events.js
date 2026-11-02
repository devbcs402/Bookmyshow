import { SocketEventNames } from './seat-lock.constants.js';

/**
 * Creates safe, anonymized event payloads for client broadcast.
 * Never leaks customer identities or Redis lock tokens.
 */
export const SeatLockEvents = {
  createSeatLockedPayload: (showId, seatIds) => ({
    showId,
    seatIds,
    status: 'LOCKED',
    timestamp: new Date().toISOString()
  }),

  createSeatReleasedPayload: (showId, seatIds) => ({
    showId,
    seatIds,
    status: 'AVAILABLE',
    timestamp: new Date().toISOString()
  }),

  createSeatExpiredPayload: (showId, seatIds) => ({
    showId,
    seatIds,
    status: 'AVAILABLE',
    timestamp: new Date().toISOString()
  }),

  createSeatBookedPayload: (showId, seatIds) => ({
    showId,
    seatIds,
    status: 'BOOKED',
    timestamp: new Date().toISOString()
  }),

  createAvailabilityUpdatedPayload: showId => ({
    showId,
    timestamp: new Date().toISOString()
  })
};

export default {
  SocketEventNames,
  SeatLockEvents
};
