import { v4 as uuidv4 } from 'uuid';
import redisConfig from '../../config/redis.js';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import { SeatLockDefaults } from './seat-lock.constants.js';
import {
  buildSeatLockKey,
  buildIdempotencyKey,
  parseSeatLockKey,
  calculateRemainingSeconds
} from './seat-lock.utils.js';
import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

// Lua Scripts for atomic coordination
const ACQUIRE_MULTI_SEAT_LOCKS_LUA = `
local ttlSeconds = tonumber(ARGV[1])
local lockId = ARGV[2]
local userId = ARGV[3]
local showId = ARGV[4]
local createdAt = tonumber(ARGV[5])
local expiresAt = tonumber(ARGV[6])

local conflictingKeys = {}
for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if val then
    table.insert(conflictingKeys, key)
  end
end

if #conflictingKeys > 0 then
  return { 0, cjson.encode(conflictingKeys) }
end

for i, key in ipairs(KEYS) do
  local payload = cjson.encode({
    lockId = lockId,
    userId = userId,
    showId = showId,
    createdAt = createdAt,
    expiresAt = expiresAt,
    renewalCount = 0
  })
  redis.call('set', key, payload, 'EX', ttlSeconds)
end

return { 1, lockId }
`;

const RELEASE_MULTI_SEAT_LOCKS_LUA = `
local lockId = ARGV[1]
local userId = ARGV[2]
local releasedKeys = {}

for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if val then
    local data = cjson.decode(val)
    if data.lockId == lockId and data.userId == userId then
      redis.call('del', key)
      table.insert(releasedKeys, key)
    end
  end
end

return { 1, cjson.encode(releasedKeys) }
`;

const RENEW_MULTI_SEAT_LOCKS_LUA = `
local ttlSeconds = tonumber(ARGV[1])
local lockId = ARGV[2]
local userId = ARGV[3]
local maxRenewals = tonumber(ARGV[4])
local newExpiresAt = tonumber(ARGV[5])

for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  if not val then
    return { 0, "LOCK_EXPIRED", key }
  end
  local data = cjson.decode(val)
  if data.lockId ~= lockId or data.userId ~= userId then
    return { 0, "OWNERSHIP_MISMATCH", key }
  end
  if data.renewalCount >= maxRenewals then
    return { 0, "MAX_RENEWALS_EXCEEDED", key }
  end
end

local updatedCount = 0
for i, key in ipairs(KEYS) do
  local val = redis.call('get', key)
  local data = cjson.decode(val)
  data.renewalCount = data.renewalCount + 1
  data.expiresAt = newExpiresAt
  redis.call('set', key, cjson.encode(data), 'EX', ttlSeconds)
  updatedCount = data.renewalCount
end

return { 1, tostring(updatedCount) }
`;

export class RedisLockService {
  /**
   * Retrieves the active Redis client with health safeguard.
   * @private
   */
  _getClient() {
    try {
      const client = redisConfig.getRedisClient();
      return client;
    } catch (error) {
      logger.error({ msg: 'Failed to access Redis client', error: error.message });
      throw new AppError(
        'Temporary seat locking coordination service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Atomically acquires temporary holds for multiple seats.
   * All-or-nothing guarantee enforced at Redis level via Lua.
   *
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @param {string} userId
   * @param {number} [ttlSeconds]
   * @returns {Promise<{ acquired: boolean, lockId?: string, expiresAt?: Date, conflictingSeatIds?: Array<string> }>}
   */
  async acquireLocks(showId, seatIds, userId, ttlSeconds = null) {
    const client = this._getClient();
    const effectiveTtl =
      ttlSeconds || config.SEAT_LOCK_TTL_SECONDS || SeatLockDefaults.DEFAULT_TTL_SECONDS;
    const lockId = uuidv4();
    const nowMs = Date.now();
    const expiresAtMs = nowMs + effectiveTtl * 1000;
    const expiresAt = new Date(expiresAtMs);

    const keys = seatIds.map(seatId => buildSeatLockKey(showId, seatId));

    try {
      const result = await client.eval(
        ACQUIRE_MULTI_SEAT_LOCKS_LUA,
        keys.length,
        ...keys,
        effectiveTtl.toString(),
        lockId,
        userId,
        showId,
        nowMs.toString(),
        expiresAtMs.toString()
      );

      const status = result[0];
      const payload = result[1];

      if (status === 1) {
        logger.info({
          msg: 'Temporary seat locks acquired successfully',
          lockId,
          showId,
          userId,
          seatCount: seatIds.length,
          ttlSeconds: effectiveTtl,
          expiresAt
        });

        return {
          acquired: true,
          lockId,
          showId,
          seatIds,
          expiresAt,
          expiresInSeconds: effectiveTtl
        };
      }

      // Conflict detected! Extract conflicting seat IDs
      const rawConflictingKeys = JSON.parse(payload || '[]');
      const conflictingSeatIds = rawConflictingKeys.map(k => {
        const parsed = parseSeatLockKey(k);
        return parsed ? parsed.seatId : k;
      });

      logger.warn({
        msg: 'Seat lock acquisition rejected due to conflict',
        showId,
        userId,
        conflictingSeatIds
      });

      return {
        acquired: false,
        conflictingSeatIds
      };
    } catch (error) {
      logger.error({
        msg: 'Redis error during atomic lock acquisition',
        error: error.message,
        showId,
        seatIds
      });
      throw new AppError(
        'Temporary seat locking coordination service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Safely releases seat locks for caller.
   * Compares lockId and userId before deleting to prevent releasing newer locks.
   *
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @param {string} lockId
   * @param {string} userId
   * @returns {Promise<{ released: boolean, releasedSeatIds: Array<string> }>}
   */
  async releaseLocks(showId, seatIds, lockId, userId) {
    const client = this._getClient();
    const keys = seatIds.map(seatId => buildSeatLockKey(showId, seatId));

    try {
      const result = await client.eval(
        RELEASE_MULTI_SEAT_LOCKS_LUA,
        keys.length,
        ...keys,
        lockId,
        userId
      );

      const releasedKeys = JSON.parse(result[1] || '[]');
      const releasedSeatIds = releasedKeys.map(k => {
        const parsed = parseSeatLockKey(k);
        return parsed ? parsed.seatId : k;
      });

      logger.info({
        msg: 'Temporary seat locks released',
        lockId,
        showId,
        userId,
        releasedCount: releasedSeatIds.length
      });

      return {
        released: true,
        releasedSeatIds
      };
    } catch (error) {
      logger.error({
        msg: 'Redis error during seat lock release',
        error: error.message,
        showId,
        lockId
      });
      throw new AppError(
        'Temporary seat locking coordination service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Renews temporary seat locks up to the configured max renewal count.
   *
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @param {string} lockId
   * @param {string} userId
   * @param {number} [ttlSeconds]
   * @param {number} [maxRenewals]
   * @returns {Promise<{ renewed: boolean, renewalCount?: number, expiresAt?: Date, expiresInSeconds?: number, errorReason?: string, failedKey?: string }>}
   */
  async renewLocks(showId, seatIds, lockId, userId, ttlSeconds = null, maxRenewals = null) {
    const client = this._getClient();
    const effectiveTtl =
      ttlSeconds || config.SEAT_LOCK_TTL_SECONDS || SeatLockDefaults.DEFAULT_TTL_SECONDS;
    const effectiveMaxRenewals =
      maxRenewals !== null && maxRenewals !== undefined
        ? maxRenewals
        : (config.MAX_LOCK_RENEWALS ?? SeatLockDefaults.MAX_LOCK_RENEWALS);

    const newExpiresAtMs = Date.now() + effectiveTtl * 1000;
    const newExpiresAt = new Date(newExpiresAtMs);
    const keys = seatIds.map(seatId => buildSeatLockKey(showId, seatId));

    try {
      const result = await client.eval(
        RENEW_MULTI_SEAT_LOCKS_LUA,
        keys.length,
        ...keys,
        effectiveTtl.toString(),
        lockId,
        userId,
        effectiveMaxRenewals.toString(),
        newExpiresAtMs.toString()
      );

      const status = result[0];

      if (status === 1) {
        const renewalCount = parseInt(result[1], 10);
        logger.info({
          msg: 'Temporary seat locks renewed',
          lockId,
          showId,
          userId,
          renewalCount,
          newExpiresAt
        });

        return {
          renewed: true,
          renewalCount,
          expiresAt: newExpiresAt,
          expiresInSeconds: effectiveTtl
        };
      }

      const errorReason = result[1];
      const failedKey = result[2];

      logger.warn({
        msg: 'Seat lock renewal rejected',
        errorReason,
        failedKey,
        lockId,
        showId,
        userId
      });

      return {
        renewed: false,
        errorReason,
        failedKey
      };
    } catch (error) {
      logger.error({
        msg: 'Redis error during lock renewal',
        error: error.message,
        showId,
        lockId
      });
      throw new AppError(
        'Temporary seat locking coordination service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Retrieves all currently active seat locks for a given show from Redis.
   * Uses SCAN cursor iteration to prevent blocking.
   *
   * @param {string} showId
   * @returns {Promise<Map<string, Object>>} Map of seatId -> lockData
   */
  async getActiveLocksForShow(showId) {
    const client = this._getClient();
    const pattern = `${SeatLockDefaults.RedisKeyPrefix?.SEAT_LOCK || 'seatlock'}:${showId}:*`;
    const lockMap = new Map();

    try {
      let cursor = '0';
      const matchingKeys = [];

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys && keys.length > 0) {
          matchingKeys.push(...keys);
        }
      } while (cursor !== '0');

      if (matchingKeys.length === 0) {
        return lockMap;
      }

      // Pipeline or MGET values in batches
      const values = await client.mget(...matchingKeys);

      for (let i = 0; i < matchingKeys.length; i++) {
        const key = matchingKeys[i];
        const val = values[i];
        if (val) {
          try {
            const data = JSON.parse(val);
            const parsed = parseSeatLockKey(key);
            if (parsed) {
              data.expiresInSeconds = calculateRemainingSeconds(data.expiresAt);
              lockMap.set(parsed.seatId, data);
            }
          } catch (_parseErr) {
            // ignore malformed key payload
          }
        }
      }

      return lockMap;
    } catch (error) {
      logger.error({
        msg: 'Failed to retrieve active locks for show from Redis',
        error: error.message,
        showId
      });
      // Fallback: throw ServiceUnavailable so availability calculation fails safely
      throw new AppError(
        'Temporary seat locking coordination service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Checks if an idempotency record exists for this user and key.
   * @param {string} userId
   * @param {string} idempotencyKey
   * @returns {Promise<Object|null>}
   */
  async checkIdempotency(userId, idempotencyKey) {
    if (!idempotencyKey) {
      return null;
    }
    const client = this._getClient();
    const key = buildIdempotencyKey(userId, idempotencyKey);

    try {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn({ msg: 'Idempotency lookup failed', error: error.message, key });
      return null;
    }
  }

  /**
   * Caches an idempotency record for a successful lock acquisition.
   * @param {string} userId
   * @param {string} idempotencyKey
   * @param {Object} payloadToMatch
   * @param {Object} responseData
   * @param {number} [ttlSeconds]
   */
  async saveIdempotency(
    userId,
    idempotencyKey,
    payloadToMatch,
    responseData,
    ttlSeconds = SeatLockDefaults.IDEMPOTENCY_TTL_SECONDS
  ) {
    if (!idempotencyKey) {
      return;
    }
    const client = this._getClient();
    const key = buildIdempotencyKey(userId, idempotencyKey);

    try {
      const record = {
        payloadToMatch,
        responseData
      };
      await client.set(key, JSON.stringify(record), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn({ msg: 'Failed to save idempotency record', error: error.message, key });
    }
  }
}

export const redisLockService = new RedisLockService();
export default redisLockService;
