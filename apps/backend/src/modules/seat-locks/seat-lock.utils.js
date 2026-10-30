import { RedisKeyPrefix } from './seat-lock.constants.js';

/**
 * Builds the atomic Redis lock key for a specific seat in a show.
 * Pattern: seatlock:{showId}:{seatId}
 * @param {string} showId
 * @param {string} seatId
 * @returns {string}
 */
export const buildSeatLockKey = (showId, seatId) => {
  return `${RedisKeyPrefix.SEAT_LOCK}:${showId}:${seatId}`;
};

/**
 * Builds the Redis key for tracking a user's active locks in a show.
 * Pattern: userlocks:{userId}:{showId}
 * @param {string} userId
 * @param {string} showId
 * @returns {string}
 */
export const buildUserLocksKey = (userId, showId) => {
  return `${RedisKeyPrefix.USER_LOCKS}:${userId}:${showId}`;
};

/**
 * Builds the idempotency key for lock requests.
 * Pattern: idempotency:seatlock:{userId}:{key}
 * @param {string} userId
 * @param {string} idempotencyKey
 * @returns {string}
 */
export const buildIdempotencyKey = (userId, idempotencyKey) => {
  return `${RedisKeyPrefix.IDEMPOTENCY}:${userId}:${idempotencyKey}`;
};

/**
 * Parses a Redis seat lock key into showId and seatId components.
 * @param {string} key
 * @returns {{ showId: string, seatId: string } | null}
 */
export const parseSeatLockKey = key => {
  if (!key || typeof key !== 'string') {
    return null;
  }
  const parts = key.split(':');
  if (parts.length === 3 && parts[0] === RedisKeyPrefix.SEAT_LOCK) {
    return { showId: parts[1], seatId: parts[2] };
  }
  return null;
};

/**
 * Calculates remaining seconds until expiration.
 * @param {Date|number|string} expiresAt
 * @returns {number}
 */
export const calculateRemainingSeconds = expiresAt => {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
};

export default {
  buildSeatLockKey,
  buildUserLocksKey,
  buildIdempotencyKey,
  parseSeatLockKey,
  calculateRemainingSeconds
};
