import { jest } from '@jest/globals';
import notificationService from '../../src/modules/notifications/services/notification.service.js';
import notificationRepository from '../../src/modules/notifications/repositories/notification.repository.js';
import notificationPreferenceService from '../../src/modules/notifications/services/notification-preference.service.js';
import notificationQueueService from '../../src/modules/notifications/queues/notification-queue.service.js';
import NotificationSocketService from '../../src/modules/notifications/services/notification-socket.service.js';
import emailProvider from '../../src/modules/notifications/providers/email/email.provider.js';
import { User } from '../../src/modules/users/model/user.model.js';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  DeliveryStatus
} from '../../src/modules/notifications/constants/notification.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('Notification Module - 7 Critical Production Scenarios', () => {
  const customerA = {
    _id: '65f1a2b3c4d5e6f7a8b9c001',
    name: 'Customer Alice',
    email: 'alice@example.com',
    phone: '+919876543210',
    role: 'CUSTOMER'
  };

  const customerB = {
    _id: '65f1a2b3c4d5e6f7a8b9c002',
    name: 'Customer Bob',
    email: 'bob@example.com',
    phone: '+919876543211',
    role: 'CUSTOMER'
  };

  const mockBookingReference = 'BK-20261030-XYZ789';

  beforeEach(() => {
    jest.spyOn(User, 'findById').mockImplementation(id => {
      const u = id.toString() === customerA._id ? customerA : customerB;
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(u)
        })
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // Scenario 1: Booking confirmation
  // ===========================================================================
  it('Scenario 1: should create in-app notification and queue external channels when booking is confirmed', async () => {
    jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
      userId: customerA._id,
      channels: { email: true, sms: true, inApp: true, whatsapp: false },
      categories: { bookingUpdates: true },
      preferredLanguage: 'en'
    });
    jest.spyOn(notificationPreferenceService, 'isChannelEnabledForCategory').mockReturnValue(true);

    const createdInApp = {
      _id: 'inapp-confirm-1',
      userId: customerA._id,
      title: 'Booking Confirmed! 🎟️',
      message: 'Your ticket is ready',
      createdAt: new Date()
    };
    jest.spyOn(notificationRepository, 'createNotification').mockResolvedValue(createdInApp);
    jest.spyOn(notificationRepository, 'countUserUnread').mockResolvedValue(1);
    jest.spyOn(notificationRepository, 'findDeliveryByIdempotencyKey').mockResolvedValue(null);
    jest.spyOn(notificationRepository, 'createDelivery').mockResolvedValue({
      _id: 'del-confirm-1',
      deliveryStatus: DeliveryStatus.QUEUED
    });

    const socketSpy = jest
      .spyOn(NotificationSocketService, 'emitNewNotification')
      .mockImplementation(() => {});
    const queueSpy = jest.spyOn(notificationQueueService, 'enqueue').mockResolvedValue(true);

    const result = await notificationService.sendNotification({
      userId: customerA._id,
      type: NotificationType.BOOKING_CONFIRMED,
      category: NotificationCategory.TRANSACTIONAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      data: {
        bookingReference: mockBookingReference,
        movieTitle: 'Interstellar'
      },
      idempotencyKey: `idemp:CONFIRM:${mockBookingReference}`
    });

    expect(result.success).toBe(true);
    expect(result.inAppNotificationId).toBe('inapp-confirm-1');
    expect(socketSpy).toHaveBeenCalled();
    // External channels (EMAIL and SMS) should both be queued
    expect(queueSpy).toHaveBeenCalledTimes(2);
  });

  // ===========================================================================
  // Scenario 2: Duplicate booking event
  // ===========================================================================
  it('Scenario 2: should avoid duplicate notification when the same booking confirmation event arrives twice', async () => {
    jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
      userId: customerA._id,
      channels: { email: true, inApp: false },
      categories: { bookingUpdates: true }
    });
    jest.spyOn(notificationPreferenceService, 'isChannelEnabledForCategory').mockReturnValue(true);

    // Delivery already exists in database with SENT status
    jest.spyOn(notificationRepository, 'findDeliveryByIdempotencyKey').mockResolvedValue({
      _id: 'del-existing',
      deliveryStatus: DeliveryStatus.SENT
    });

    const queueSpy = jest.spyOn(notificationQueueService, 'enqueue');

    const result = await notificationService.sendNotification({
      userId: customerA._id,
      type: NotificationType.BOOKING_CONFIRMED,
      channels: [NotificationChannel.EMAIL],
      idempotencyKey: `idemp:CONFIRM:${mockBookingReference}`
    });

    expect(result.success).toBe(true);
    expect(result.queuedDeliveries[0].duplicate).toBe(true);
    expect(queueSpy).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Scenario 3: Provider outage
  // ===========================================================================
  it('Scenario 3: should schedule retry and log failure without impacting booking state when email provider fails', async () => {
    const mockDelivery = {
      _id: 'del-retry-1',
      deliveryStatus: DeliveryStatus.PROCESSING,
      attemptCount: 0,
      maxAttempts: 3
    };
    jest.spyOn(notificationRepository, 'findDeliveryById').mockResolvedValue(mockDelivery);
    jest.spyOn(notificationRepository, 'updateDelivery').mockResolvedValue({});
    // Simulate provider outage
    jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue({
      success: false,
      error: 'Upstream SMTP connection timed out'
    });

    const retrySpy = jest
      .spyOn(notificationQueueService, 'scheduleRetry')
      .mockResolvedValue(new Date(Date.now() + 5000));
    const appendSpy = jest
      .spyOn(notificationRepository, 'appendRetryHistory')
      .mockResolvedValue({});

    const outcome = await notificationService.deliverJob({
      deliveryId: 'del-retry-1',
      channel: NotificationChannel.EMAIL,
      recipient: customerA.email,
      attemptCount: 0
    });

    expect(outcome).toBe(false);
    expect(retrySpy).toHaveBeenCalledWith(
      expect.anything(),
      1,
      'Upstream SMTP connection timed out'
    );
    expect(appendSpy).toHaveBeenCalled();
  });

  // ===========================================================================
  // Scenario 4: Customer offline
  // ===========================================================================
  it('Scenario 4: should durably persist in-app notification in MongoDB even if customer is offline from Socket.IO', async () => {
    // Socket emit fails or does nothing because client is disconnected
    jest.spyOn(NotificationSocketService, 'emitNewNotification').mockImplementation(() => {});
    jest.spyOn(NotificationSocketService, 'emitUnreadCountUpdated').mockImplementation(() => {});

    jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
      userId: customerA._id,
      channels: { inApp: true, email: false },
      categories: { bookingUpdates: true }
    });
    jest.spyOn(notificationPreferenceService, 'isChannelEnabledForCategory').mockReturnValue(true);

    const savedDoc = {
      _id: 'inapp-offline-1',
      userId: customerA._id,
      title: 'Ticket Available!',
      message: 'Tickets are now open for your watchlist movie',
      isRead: false,
      createdAt: new Date()
    };
    jest.spyOn(notificationRepository, 'createNotification').mockResolvedValue(savedDoc);
    jest.spyOn(notificationRepository, 'countUserUnread').mockResolvedValue(1);

    // Notification is dispatched while user is offline
    const result = await notificationService.sendNotification({
      userId: customerA._id,
      type: NotificationType.TICKET_AVAILABLE,
      channels: [NotificationChannel.IN_APP]
    });

    expect(result.success).toBe(true);
    expect(result.inAppNotificationId).toBe('inapp-offline-1');

    // Customer reconnects later and queries notification history:
    jest.spyOn(notificationRepository, 'findUserNotifications').mockResolvedValue({
      items: [savedDoc],
      total: 1,
      page: 1,
      limit: 20
    });

    const feed = await notificationService.getUserNotifications(customerA._id);
    expect(feed.items[0]._id).toBe('inapp-offline-1');
    expect(feed.items[0].isRead).toBe(false);
  });

  // ===========================================================================
  // Scenario 5: Unauthorized access (BOLA defense)
  // ===========================================================================
  it('Scenario 5: should deny Customer B from marking as read or deleting Customer A notifications (BOLA defense)', async () => {
    // When Customer B tries to modify Customer A's notification, repository query with { _id, userId } yields null
    jest.spyOn(notificationRepository, 'markAsRead').mockResolvedValue(null);
    jest.spyOn(notificationRepository, 'deleteNotification').mockResolvedValue(null);

    await expect(notificationService.markAsRead('inapp-alice-1', customerB._id)).rejects.toThrow(
      AppError
    );

    await expect(
      notificationService.deleteNotification('inapp-alice-1', customerB._id)
    ).rejects.toThrow(AppError);
  });

  // ===========================================================================
  // Scenario 6: Promotional consent
  // ===========================================================================
  it('Scenario 6: should refuse to send promotional marketing notifications through disabled channels', async () => {
    // User explicitly disabled promotionalUpdates in categories
    jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
      userId: customerA._id,
      channels: { email: true, inApp: true },
      categories: { promotionalUpdates: false, bookingUpdates: true }
    });

    jest
      .spyOn(notificationPreferenceService, 'isChannelEnabledForCategory')
      .mockImplementation((_prefs, _channel, category) => {
        if (category === NotificationCategory.MARKETING) {
          return false;
        }
        return true;
      });

    const inAppSpy = jest.spyOn(notificationRepository, 'createNotification');
    const queueSpy = jest.spyOn(notificationQueueService, 'enqueue');

    const result = await notificationService.sendNotification({
      userId: customerA._id,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      category: NotificationCategory.MARKETING,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      data: {
        title: '50% Weekend Flash Sale!',
        message: 'Book today and get 50% discount'
      }
    });

    expect(result.success).toBe(true);
    expect(inAppSpy).not.toHaveBeenCalled();
    expect(queueSpy).not.toHaveBeenCalled();
    expect(result.queuedDeliveries.length).toBe(0);
  });

  // ===========================================================================
  // Scenario 7: Duplicate background job
  // ===========================================================================
  it('Scenario 7: should execute job idempotently and avoid re-dispatching when a background delivery job runs multiple times', async () => {
    // Job already marked SENT by first execution
    const mockAlreadySentDelivery = {
      _id: 'del-job-1',
      deliveryStatus: DeliveryStatus.SENT,
      sentAt: new Date()
    };
    jest
      .spyOn(notificationRepository, 'findDeliveryById')
      .mockResolvedValue(mockAlreadySentDelivery);
    const emailSpy = jest.spyOn(emailProvider, 'sendEmail');

    const outcome = await notificationService.deliverJob({
      deliveryId: 'del-job-1',
      channel: NotificationChannel.EMAIL,
      recipient: customerA.email,
      body: 'Booking Confirmed'
    });

    // Returns true (idempotent success) and does NOT call external email provider again
    expect(outcome).toBe(true);
    expect(emailSpy).not.toHaveBeenCalled();
  });
});
