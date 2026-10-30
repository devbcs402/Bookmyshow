import Redis from 'ioredis';
import config from './env.js';
import logger from './logger.js';

let redisClient = null;

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn({ msg: 'Redis reconnecting...', attempt: times, delayMs: delay });
        return delay;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis socket connection initiated');
    });

    redisClient.on('ready', () => {
      logger.info('Redis connection established and ready');
    });

    redisClient.on('error', err => {
      logger.error({ msg: 'Redis connection error', error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis attempting reconnection...');
    });
  }

  return redisClient;
};

export const connectRedis = async () => {
  const client = getRedisClient();
  if (client.status === 'ready' || client.status === 'connecting') {
    return client;
  }

  try {
    const maskedUrl = config.REDIS_URL.replace(/:([^@]+)@/, ':****@');
    logger.info({ msg: 'Connecting to Redis...', url: maskedUrl });
    await client.connect();
    return client;
  } catch (error) {
    logger.error({ msg: 'Failed to connect to Redis', error: error.message });
    throw error;
  }
};

export const disconnectRedis = async () => {
  if (redisClient && redisClient.status !== 'end') {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed.');
  }
};

export const getRedisHealth = async () => {
  if (!redisClient) {
    return {
      status: 'disconnected',
      isHealthy: false,
      latencyMs: null
    };
  }

  try {
    const start = Date.now();
    const pong = await redisClient.ping();
    const latencyMs = Date.now() - start;

    return {
      status: redisClient.status,
      isHealthy: pong === 'PONG',
      latencyMs
    };
  } catch (_error) {
    return {
      status: redisClient.status,
      isHealthy: false,
      latencyMs: null
    };
  }
};

export default {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  getRedisHealth
};

