import redisConfig from '../../../config/redis.js';
import logger from '../../../config/logger.js';
import {
  NotificationRedisKeys,
  NotificationDefaults
} from '../constants/notification.constants.js';

const getRedis = () => {
  try {
    return redisConfig.getRedisClient();
  } catch (_e) {
    return null;
  }
};

export class NotificationQueueService {
  constructor() {
    this.inMemoryQueue = [];
    this.delayedRetries = [];
    this.isProcessing = false;
    this.deliveryHandler = null;
  }

  /**
   * Registers the worker execution handler (bound to NotificationService).
   * @param {Function} handler
   */
  setDeliveryHandler(handler) {
    this.deliveryHandler = handler;
  }

  /**
   * Calculates exponential backoff delay in milliseconds.
   *
   * @param {number} attempt
   * @param {number} [initialBackoffSeconds=5]
   * @returns {number} Delay in milliseconds
   */
  static calculateBackoffDelayMs(
    attempt,
    initialBackoffSeconds = NotificationDefaults.INITIAL_BACKOFF_SECONDS
  ) {
    // delay = initial * 2^(attempt - 1)
    const factor = Math.pow(2, Math.max(0, attempt - 1));
    const delaySeconds = Math.min(
      initialBackoffSeconds * factor,
      NotificationDefaults.MAX_BACKOFF_SECONDS
    );
    return delaySeconds * 1000;
  }

  /**
   * Enqueues a notification job for asynchronous background processing.
   *
   * @param {Object} job
   * @param {string} job.deliveryId MongoDB delivery record ID
   * @param {string} job.channel EMAIL | SMS | WHATSAPP
   * @param {string} job.idempotencyKey
   * @param {Object} job.payload
   * @param {number} [job.attemptCount=0]
   * @returns {Promise<boolean>}
   */
  async enqueue(job) {
    const jobData = {
      ...job,
      enqueuedAt: Date.now(),
      attemptCount: job.attemptCount || 0
    };

    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      try {
        const queueKey = this._resolveQueueKey(job.channel);
        await redis.rpush(queueKey, JSON.stringify(jobData));
        logger.debug({ deliveryId: job.deliveryId, channel: job.channel }, 'Job queued in Redis');
        return true;
      } catch (err) {
        logger.warn(
          { err: err.message, deliveryId: job.deliveryId },
          'Redis enqueue failed; falling back to in-memory queue'
        );
      }
    }

    // In-memory queue fallback
    this.inMemoryQueue.push(jobData);
    logger.debug({ deliveryId: job.deliveryId, channel: job.channel }, 'Job queued in memory');

    // Trigger asynchronous memory consumer tick
    setImmediate(() => {
      this.processNextInMemoryJob();
    });

    return true;
  }

  /**
   * Schedules a delayed retry job using Redis sorted set or in-memory timer.
   *
   * @param {Object} job
   * @param {number} nextAttempt
   * @param {string} errorReason
   * @returns {Promise<Date>} Scheduled retry timestamp
   */
  async scheduleRetry(job, nextAttempt, errorReason) {
    const delayMs = NotificationQueueService.calculateBackoffDelayMs(nextAttempt);
    const retryTimestamp = Date.now() + delayMs;
    const retryDate = new Date(retryTimestamp);

    const retryJob = {
      ...job,
      attemptCount: nextAttempt,
      lastError: errorReason,
      scheduledAt: retryTimestamp
    };

    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      try {
        await redis.zadd(
          NotificationRedisKeys.DELAYED_RETRIES_ZSET,
          retryTimestamp,
          JSON.stringify(retryJob)
        );
        logger.info(
          {
            deliveryId: job.deliveryId,
            nextAttempt,
            retryAt: retryDate.toISOString()
          },
          'Delayed retry scheduled in Redis'
        );
        return retryDate;
      } catch (err) {
        logger.warn(
          { err: err.message, deliveryId: job.deliveryId },
          'Redis retry schedule failed; falling back to memory timer'
        );
      }
    }

    // In-memory timer fallback
    const timer = setTimeout(() => {
      this.enqueue(retryJob);
    }, delayMs);
    if (timer && timer.unref) {
      timer.unref();
    }

    logger.info(
      { deliveryId: job.deliveryId, nextAttempt, delayMs },
      'Delayed retry scheduled in memory'
    );
    return retryDate;
  }

  /**
   * Marks a job as permanently failed and routes it to the dead-letter sink.
   *
   * @param {Object} job
   * @param {string} finalError
   */
  async routeToDeadLetter(job, finalError) {
    logger.error(
      { deliveryId: job.deliveryId, channel: job.channel, finalError },
      'Notification job permanently failed after exhausting retry attempts'
    );

    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      try {
        const deadLetterPayload = JSON.stringify({
          ...job,
          finalError,
          failedAt: new Date().toISOString()
        });
        await redis.rpush(NotificationRedisKeys.DEAD_LETTER, deadLetterPayload);
      } catch (err) {
        logger.debug({ err: err.message }, 'Failed to record in Redis dead letter list');
      }
    }
  }

  /**
   * Consumes jobs from the in-memory queue.
   */
  async processNextInMemoryJob() {
    if (this.isProcessing || this.inMemoryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.inMemoryQueue.shift();

    try {
      if (this.deliveryHandler && job) {
        await this.deliveryHandler(job);
      }
    } catch (err) {
      logger.error(
        { err: err.message, deliveryId: job?.deliveryId },
        'Error during in-memory job execution'
      );
    } finally {
      this.isProcessing = false;
      if (this.inMemoryQueue.length > 0) {
        setImmediate(() => {
          this.processNextInMemoryJob();
        });
      }
    }
  }

  /**
   * Sweeps delayed retries whose score (timestamp) is less than or equal to Date.now().
   * Called by periodic worker or on-demand.
   * @returns {Promise<number>} Number of retries enqueued
   */
  async sweepDueRetries() {
    const redis = getRedis();
    if (!redis || redis.status !== 'ready') {
      return 0;
    }

    const now = Date.now();
    try {
      // Find due jobs
      const dueJobs = await redis.zrangebyscore(
        NotificationRedisKeys.DELAYED_RETRIES_ZSET,
        0,
        now,
        'LIMIT',
        0,
        50
      );

      if (!dueJobs || dueJobs.length === 0) {
        return 0;
      }

      for (const rawJob of dueJobs) {
        const removed = await redis.zrem(NotificationRedisKeys.DELAYED_RETRIES_ZSET, rawJob);
        if (removed > 0) {
          const parsed = JSON.parse(rawJob);
          await this.enqueue(parsed);
        }
      }

      return dueJobs.length;
    } catch (err) {
      logger.warn({ err: err.message }, 'Error sweeping delayed retries in Redis');
      return 0;
    }
  }

  _resolveQueueKey(channel) {
    switch (channel) {
      case 'EMAIL':
        return NotificationRedisKeys.QUEUE_EMAIL;
      case 'SMS':
        return NotificationRedisKeys.QUEUE_SMS;
      case 'WHATSAPP':
        return NotificationRedisKeys.QUEUE_WHATSAPP;
      default:
        return 'notifications:queue:default';
    }
  }
}

export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;
