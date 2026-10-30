import { jest } from '@jest/globals';
import notificationQueueService, {
  NotificationQueueService
} from '../../src/modules/notifications/queues/notification-queue.service.js';

describe('NotificationQueueService Unit Tests', () => {
  describe('Exponential Backoff Delay Calculation', () => {
    it('should calculate exponential backoff accurately based on attempt number', () => {
      // initialBackoff = 5 seconds
      // attempt 1 -> 5 * 2^0 = 5s = 5000ms
      expect(NotificationQueueService.calculateBackoffDelayMs(1, 5)).toBe(5000);
      // attempt 2 -> 5 * 2^1 = 10s = 10000ms
      expect(NotificationQueueService.calculateBackoffDelayMs(2, 5)).toBe(10000);
      // attempt 3 -> 5 * 2^2 = 20s = 20000ms
      expect(NotificationQueueService.calculateBackoffDelayMs(3, 5)).toBe(20000);
      // attempt 4 -> 5 * 2^3 = 40s = 40000ms
      expect(NotificationQueueService.calculateBackoffDelayMs(4, 5)).toBe(40000);
    });

    it('should cap exponential backoff at maximum backoff limit', () => {
      // 10 attempts should not exceed 3600 seconds = 3600000ms
      const delay = NotificationQueueService.calculateBackoffDelayMs(15, 5);
      expect(delay).toBe(3600000);
    });
  });

  describe('Enqueue & In-Memory Worker Execution', () => {
    it('should enqueue job and invoke deliveryHandler asynchronously', async () => {
      const mockHandler = jest.fn().mockResolvedValue(true);
      notificationQueueService.setDeliveryHandler(mockHandler);

      const job = {
        deliveryId: 'del-123',
        channel: 'EMAIL',
        idempotencyKey: 'idemp-123'
      };

      await notificationQueueService.enqueue(job);

      // Wait for setImmediate tick
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'del-123',
          channel: 'EMAIL'
        })
      );
    });

    it('should schedule retry with future timestamp', async () => {
      const job = { deliveryId: 'del-456', channel: 'SMS' };
      const retryDate = await notificationQueueService.scheduleRetry(job, 1, 'Network timeout');

      expect(retryDate).toBeInstanceOf(Date);
      expect(retryDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
