import { jest } from '@jest/globals';
import notificationService from '../../src/modules/notifications/services/notification.service.js';
import notificationRepository from '../../src/modules/notifications/repositories/notification.repository.js';
import notificationPreferenceService from '../../src/modules/notifications/services/notification-preference.service.js';
import NotificationSocketService from '../../src/modules/notifications/services/notification-socket.service.js';
import notificationQueueService from '../../src/modules/notifications/queues/notification-queue.service.js';
import emailProvider from '../../src/modules/notifications/providers/email/email.provider.js';
import { User } from '../../src/modules/users/model/user.model.js';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  DeliveryStatus,
  NotificationProvider
} from '../../src/modules/notifications/constants/notification.constants.js';

describe('NotificationService Unit Tests', () => {
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockUser = {
    _id: mockUserId,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+919876543210',
    role: 'CUSTOMER'
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendNotification', () => {
    it('should create in-app notification and enqueue external channel deliveries', async () => {
      // Mock User
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // Mock Preferences
      jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
        userId: mockUserId,
        channels: { email: true, sms: true, inApp: true, whatsapp: false },
        categories: { bookingUpdates: true, paymentUpdates: true, securityAlerts: true },
        preferredLanguage: 'en',
        whatsappConsent: false
      });
      jest
        .spyOn(notificationPreferenceService, 'isChannelEnabledForCategory')
        .mockReturnValue(true);

      // Mock Repositories
      const mockInAppDoc = {
        _id: 'inapp-123',
        userId: mockUserId,
        title: 'Booking Confirmed!',
        message: 'Your booking is confirmed',
        createdAt: new Date()
      };
      jest.spyOn(notificationRepository, 'createNotification').mockResolvedValue(mockInAppDoc);
      jest.spyOn(notificationRepository, 'countUserUnread').mockResolvedValue(1);
      jest.spyOn(notificationRepository, 'findDeliveryByIdempotencyKey').mockResolvedValue(null);
      jest.spyOn(notificationRepository, 'createDelivery').mockResolvedValue({
        _id: 'del-101',
        deliveryStatus: DeliveryStatus.QUEUED
      });

      // Mock Socket & Queue
      const socketSpy = jest
        .spyOn(NotificationSocketService, 'emitNewNotification')
        .mockImplementation(() => {});
      const queueSpy = jest.spyOn(notificationQueueService, 'enqueue').mockResolvedValue(true);

      const result = await notificationService.sendNotification({
        userId: mockUserId,
        type: NotificationType.BOOKING_CONFIRMED,
        category: NotificationCategory.TRANSACTIONAL,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        data: {
          bookingReference: 'BK-100',
          movieTitle: 'Inception'
        },
        idempotencyKey: 'idemp:test:100'
      });

      expect(result.success).toBe(true);
      expect(result.inAppNotificationId).toBe('inapp-123');
      expect(socketSpy).toHaveBeenCalled();
      expect(queueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          recipient: mockUser.email
        })
      );
    });

    it('should detect duplicate notification via idempotencyKey and avoid re-enqueuing', async () => {
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser)
        })
      });

      jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
        userId: mockUserId,
        channels: { email: true, inApp: false },
        categories: { bookingUpdates: true },
        preferredLanguage: 'en'
      });
      jest
        .spyOn(notificationPreferenceService, 'isChannelEnabledForCategory')
        .mockReturnValue(true);

      // Existing delivery in DB
      jest.spyOn(notificationRepository, 'findDeliveryByIdempotencyKey').mockResolvedValue({
        _id: 'del-existing',
        deliveryStatus: DeliveryStatus.SENT
      });

      const queueSpy = jest.spyOn(notificationQueueService, 'enqueue');

      const result = await notificationService.sendNotification({
        userId: mockUserId,
        type: NotificationType.BOOKING_CONFIRMED,
        channels: [NotificationChannel.EMAIL],
        idempotencyKey: 'idemp:duplicate:123'
      });

      expect(result.success).toBe(true);
      expect(result.queuedDeliveries[0].duplicate).toBe(true);
      expect(queueSpy).not.toHaveBeenCalled();
    });

    it('should skip channels disabled in user preferences', async () => {
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // User disabled SMS
      jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
        userId: mockUserId,
        channels: { email: true, sms: false, inApp: true }
      });
      jest
        .spyOn(notificationPreferenceService, 'isChannelEnabledForCategory')
        .mockImplementation((_p, channel) => channel !== NotificationChannel.SMS);

      jest
        .spyOn(notificationRepository, 'createNotification')
        .mockResolvedValue({ _id: 'notif-1' });
      jest.spyOn(notificationRepository, 'countUserUnread').mockResolvedValue(1);
      jest.spyOn(notificationRepository, 'findDeliveryByIdempotencyKey').mockResolvedValue(null);
      jest.spyOn(notificationRepository, 'createDelivery').mockResolvedValue({ _id: 'del-email' });
      const queueSpy = jest.spyOn(notificationQueueService, 'enqueue').mockResolvedValue(true);

      await notificationService.sendNotification({
        userId: mockUserId,
        type: NotificationType.BOOKING_CONFIRMED,
        channels: [NotificationChannel.SMS, NotificationChannel.EMAIL]
      });

      // Enqueue should only be called for EMAIL, not SMS
      expect(queueSpy).toHaveBeenCalledTimes(1);
      expect(queueSpy).toHaveBeenCalledWith(
        expect.objectContaining({ channel: NotificationChannel.EMAIL })
      );
    });
  });

  describe('deliverJob', () => {
    it('should mark delivery as SENT upon successful provider dispatch', async () => {
      const mockDelivery = {
        _id: 'del-101',
        deliveryStatus: DeliveryStatus.PROCESSING,
        maxAttempts: 3
      };
      jest.spyOn(notificationRepository, 'findDeliveryById').mockResolvedValue(mockDelivery);
      const updateSpy = jest.spyOn(notificationRepository, 'updateDelivery').mockResolvedValue({});
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue({
        success: true,
        provider: NotificationProvider.MOCK_EMAIL,
        messageId: 'msg-999'
      });

      const outcome = await notificationService.deliverJob({
        deliveryId: 'del-101',
        channel: NotificationChannel.EMAIL,
        recipient: 'test@example.com',
        subject: 'Confirmed',
        body: '<p>Hi</p>'
      });

      expect(outcome).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        'del-101',
        expect.objectContaining({
          deliveryStatus: DeliveryStatus.SENT,
          providerMessageId: 'msg-999'
        })
      );
    });

    it('should schedule retry when provider dispatch fails and attempts remain', async () => {
      const mockDelivery = {
        _id: 'del-102',
        deliveryStatus: DeliveryStatus.PROCESSING,
        attemptCount: 0,
        maxAttempts: 3
      };
      jest.spyOn(notificationRepository, 'findDeliveryById').mockResolvedValue(mockDelivery);
      jest.spyOn(notificationRepository, 'updateDelivery').mockResolvedValue({});
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue({
        success: false,
        error: 'Network connection reset by peer'
      });

      const retrySpy = jest
        .spyOn(notificationQueueService, 'scheduleRetry')
        .mockResolvedValue(new Date(Date.now() + 5000));
      const historySpy = jest
        .spyOn(notificationRepository, 'appendRetryHistory')
        .mockResolvedValue({});

      const outcome = await notificationService.deliverJob({
        deliveryId: 'del-102',
        channel: NotificationChannel.EMAIL,
        recipient: 'test@example.com',
        attemptCount: 0
      });

      expect(outcome).toBe(false);
      expect(retrySpy).toHaveBeenCalledWith(
        expect.anything(),
        1,
        'Network connection reset by peer'
      );
      expect(historySpy).toHaveBeenCalled();
    });

    it('should mark PERMANENTLY_FAILED and route to dead letter when max retries are exhausted', async () => {
      const mockDelivery = {
        _id: 'del-103',
        deliveryStatus: DeliveryStatus.PROCESSING,
        attemptCount: 2,
        maxAttempts: 3
      };
      jest.spyOn(notificationRepository, 'findDeliveryById').mockResolvedValue(mockDelivery);
      const updateSpy = jest.spyOn(notificationRepository, 'updateDelivery').mockResolvedValue({});
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue({
        success: false,
        error: 'Authentication failed at gateway'
      });
      const deadLetterSpy = jest
        .spyOn(notificationQueueService, 'routeToDeadLetter')
        .mockResolvedValue();

      const outcome = await notificationService.deliverJob({
        deliveryId: 'del-103',
        channel: NotificationChannel.EMAIL,
        recipient: 'test@example.com',
        attemptCount: 2 // attemptCount + 1 = 3 === maxAttempts
      });

      expect(outcome).toBe(false);
      expect(updateSpy).toHaveBeenCalledWith(
        'del-103',
        expect.objectContaining({
          deliveryStatus: DeliveryStatus.PERMANENTLY_FAILED,
          lastError: 'Authentication failed at gateway'
        })
      );
      expect(deadLetterSpy).toHaveBeenCalled();
    });
  });
});
