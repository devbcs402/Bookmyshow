export const SEAT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  SELECTED: 'SELECTED',
  LOCKED_BY_ME: 'LOCKED_BY_ME',
  LOCKED_BY_OTHER: 'LOCKED_BY_OTHER',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'INACTIVE'
});

export const SEAT_CATEGORY_TIERS = Object.freeze({
  PLATINUM: 'PLATINUM',
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  RECLINER: 'RECLINER',
  STANDARD: 'STANDARD'
});

export const BOOKING_STATUS = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED'
});

export const SOCKET_EVENTS = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_SHOW_ROOM: 'show:join',
  LEAVE_SHOW_ROOM: 'show:leave',
  SEAT_LOCKED: 'seat:locked',
  SEAT_RELEASED: 'seat:released',
  SEAT_EXPIRED: 'seat:expired',
  SEAT_BOOKED: 'seat:booked',
  AVAILABILITY_UPDATED: 'show:availability-updated',
  NOTIFICATION_NEW: 'notification:new',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled'
});

export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: 'bms_access_token',
  USER_DATA: 'bms_user_data',
  SELECTED_CITY: 'bms_selected_city',
  RECENTLY_VIEWED: 'bms_recently_viewed_local',
  ACTIVE_LOCK: 'bms_active_seat_lock'
});

export const DEFAULT_CITY = Object.freeze({
  _id: 'default-mumbai',
  name: 'Mumbai',
  state: 'Maharashtra',
  code: 'BOM'
});

