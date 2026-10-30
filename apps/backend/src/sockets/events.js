export const SocketEvents = Object.freeze({
  // Connection lifecycle
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Show seat room events (reserved for future real-time locking)
  JOIN_SHOW_ROOM: 'show:join',
  LEAVE_SHOW_ROOM: 'show:leave',
  SEATS_LOCKED: 'show:seats_locked',
  SEATS_RELEASED: 'show:seats_released',
  SEATS_BOOKED: 'show:seats_booked'
});

export default SocketEvents;

