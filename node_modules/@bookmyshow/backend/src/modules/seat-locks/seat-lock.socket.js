import { v4 as uuidv4 } from 'uuid';
import logger from '../../config/logger.js';
import config from '../../config/env.js';
import redisConfig from '../../config/redis.js';
import { SocketEventNames, RedisKeyPrefix } from './seat-lock.constants.js';
import { SeatLockEvents } from './seat-lock.events.js';

const instanceId = uuidv4();
let localIo = null;
let pubClient = null;
let subClient = null;
let isPubSubInitialized = false;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Initializes Redis Pub/Sub connection for cross-instance socket broadcasting.
 * @param {import('socket.io').Server} io
 */
export const initRedisPubSub = async io => {
  localIo = io;
  if (isPubSubInitialized) {
    return;
  }
  // Skip background Pub/Sub subscription in test environment to avoid lingering handles
  if (config.NODE_ENV === 'test') {
    return;
  }

  try {
    const baseClient = redisConfig.getRedisClient();
    if (!baseClient) {
      return;
    }

    pubClient = baseClient.duplicate();
    subClient = baseClient.duplicate();

    await subClient.subscribe(RedisKeyPrefix.PUBSUB_CHANNEL);

    subClient.on('message', (channel, message) => {
      if (channel !== RedisKeyPrefix.PUBSUB_CHANNEL) {
        return;
      }

      try {
        const parsed = JSON.parse(message);
        // Only broadcast if message originated from another Node.js instance
        if (parsed.instanceId !== instanceId && localIo) {
          const room = `show:${parsed.showId}`;
          localIo.to(room).emit(parsed.eventName, parsed.payload);
        }
      } catch (err) {
        logger.error({ msg: 'Failed to process Redis pub/sub socket message', error: err.message });
      }
    });

    isPubSubInitialized = true;
    logger.info({
      msg: 'Seat lock Redis Pub/Sub cross-instance adapter initialized',
      channel: RedisKeyPrefix.PUBSUB_CHANNEL,
      instanceId
    });
  } catch (err) {
    logger.warn({
      msg: 'Redis Pub/Sub adapter setup skipped (standalone or test mode)',
      error: err.message
    });
  }
};

/**
 * Gracefully shuts down Redis Pub/Sub clients.
 */
export const closeRedisPubSub = async () => {
  if (subClient) {
    try {
      await subClient.quit();
    } catch (err) {
      logger.debug({ err: err.message }, 'Redis subClient shutdown error ignored');
    }
    subClient = null;
  }
  if (pubClient) {
    try {
      await pubClient.quit();
    } catch (err) {
      logger.debug({ err: err.message }, 'Redis pubClient shutdown error ignored');
    }
    pubClient = null;
  }
  isPubSubInitialized = false;
};

/**
 * Registers seat lock room listeners on a connected socket client.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerSeatLockSocketHandlers = (socket, io) => {
  localIo = io;

  // Handle client joining a show room for live availability updates
  socket.on(SocketEventNames.JOIN_SHOW, payload => {
    const showId = typeof payload === 'string' ? payload : payload?.showId;

    if (!showId || !objectIdRegex.test(showId)) {
      socket.emit('error', { message: 'Invalid showId provided for room subscription' });
      return;
    }

    const room = `show:${showId}`;
    socket.join(room);

    logger.debug({
      msg: 'Client joined show room',
      socketId: socket.id,
      room,
      role: socket.data?.user?.role
    });

    socket.emit('show:joined', { showId, room });
  });

  // Handle client leaving a show room
  socket.on(SocketEventNames.LEAVE_SHOW, payload => {
    const showId = typeof payload === 'string' ? payload : payload?.showId;
    if (showId) {
      const room = `show:${showId}`;
      socket.leave(room);
      logger.debug({ msg: 'Client left show room', socketId: socket.id, room });
    }
  });
};

/**
 * Broadcasts an event to a show room across the local instance and peer instances.
 * @param {string} showId
 * @param {string} eventName
 * @param {Object} payload
 */
export const broadcastShowRoomEvent = async (showId, eventName, payload) => {
  const room = `show:${showId}`;

  // 1. Emit to local instance clients
  if (localIo) {
    try {
      localIo.to(room).emit(eventName, payload);
    } catch (err) {
      logger.error({ msg: 'Local socket broadcast failed', error: err.message, room, eventName });
    }
  }

  // 2. Publish to Redis Pub/Sub channel for multi-instance distribution
  if (pubClient && pubClient.status === 'ready') {
    try {
      const crossInstanceMessage = JSON.stringify({
        instanceId,
        showId,
        eventName,
        payload
      });
      await pubClient.publish(RedisKeyPrefix.PUBSUB_CHANNEL, crossInstanceMessage);
    } catch (err) {
      logger.warn({ msg: 'Redis cross-instance publish failed', error: err.message });
    }
  }
};

/**
 * Public notification triggers
 */
export const emitSeatLocked = async (showId, seatIds) => {
  const payload = SeatLockEvents.createSeatLockedPayload(showId, seatIds);
  await broadcastShowRoomEvent(showId, SocketEventNames.SEAT_LOCKED, payload);
  await broadcastShowRoomEvent(
    showId,
    SocketEventNames.AVAILABILITY_UPDATED,
    SeatLockEvents.createAvailabilityUpdatedPayload(showId)
  );
};

export const emitSeatReleased = async (showId, seatIds) => {
  const payload = SeatLockEvents.createSeatReleasedPayload(showId, seatIds);
  await broadcastShowRoomEvent(showId, SocketEventNames.SEAT_RELEASED, payload);
  await broadcastShowRoomEvent(
    showId,
    SocketEventNames.AVAILABILITY_UPDATED,
    SeatLockEvents.createAvailabilityUpdatedPayload(showId)
  );
};

export const emitSeatExpired = async (showId, seatIds) => {
  const payload = SeatLockEvents.createSeatExpiredPayload(showId, seatIds);
  await broadcastShowRoomEvent(showId, SocketEventNames.SEAT_EXPIRED, payload);
  await broadcastShowRoomEvent(
    showId,
    SocketEventNames.AVAILABILITY_UPDATED,
    SeatLockEvents.createAvailabilityUpdatedPayload(showId)
  );
};

export const emitSeatBooked = async (showId, seatIds) => {
  const payload = SeatLockEvents.createSeatBookedPayload(showId, seatIds);
  await broadcastShowRoomEvent(showId, SocketEventNames.SEAT_BOOKED, payload);
  await broadcastShowRoomEvent(
    showId,
    SocketEventNames.AVAILABILITY_UPDATED,
    SeatLockEvents.createAvailabilityUpdatedPayload(showId)
  );
};

export const emitAvailabilityUpdated = async (showId, metadata = {}) => {
  const payload = SeatLockEvents.createAvailabilityUpdatedPayload(showId, metadata);
  await broadcastShowRoomEvent(showId, SocketEventNames.AVAILABILITY_UPDATED, payload);
};

export const SeatLockSocket = {
  initRedisPubSub,
  closeRedisPubSub,
  registerSeatLockSocketHandlers,
  broadcastShowRoomEvent,
  emitSeatLocked,
  emitSeatReleased,
  emitSeatExpired,
  emitSeatBooked,
  emitAvailabilityUpdated
};

export const seatLockSocket = SeatLockSocket;
export default SeatLockSocket;
