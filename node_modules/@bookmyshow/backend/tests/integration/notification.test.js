import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import notificationService from '../../src/modules/notifications/services/notification.service.js';
import notificationPreferenceService from '../../src/modules/notifications/services/notification-preference.service.js';
import adminNotificationService from '../../src/modules/notifications/services/admin-notification.service.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import {
  NotificationType,
  NotificationCategory
} from '../../src/modules/notifications/constants/notification.constants.js';

describe('Notification Module Integration Tests', () => {
  let app;
  let customerToken;
  let adminToken;

  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c001';
  const mockAdminId = '65f1a2b3c4d5e6f7a8b9c099';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c088';
  const mockNotificationId = '65f1a2b3c4d5e6f7a8b9c011';

  beforeAll(() => {
    app = createApp();

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });

    adminToken = generateAccessToken({
      userId: mockAdminId,
      sessionId: mockSessionId,
      role: Roles.SUPER_ADMIN,
      partnerId: null
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockAdminId) {
        return Promise.resolve({
          _id: mockAdminId,
          role: Roles.SUPER_ADMIN,
          isActive: true,
          deletedAt: null
        });
      }
      return Promise.resolve({
        _id: userId,
        role: Roles.CUSTOMER,
        isActive: true,
        deletedAt: null
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/notifications', () => {
    it('should return paginated notifications for authenticated user', async () => {
      jest.spyOn(notificationService, 'getUserNotifications').mockResolvedValue({
        items: [
          {
            _id: mockNotificationId,
            title: 'Booking Confirmed!',
            message: 'Your ticket is ready',
            type: NotificationType.BOOKING_CONFIRMED,
            category: NotificationCategory.TRANSACTIONAL,
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count for user', async () => {
      jest.spyOn(notificationService, 'getUserUnreadCount').mockResolvedValue(3);

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(3);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      jest.spyOn(notificationService, 'markAsRead').mockResolvedValue({
        _id: mockNotificationId,
        isRead: true,
        readAt: new Date().toISOString()
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${mockNotificationId}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });

    it('should reject invalid 24-character ObjectId param with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      jest.spyOn(notificationService, 'markAllAsRead').mockResolvedValue({
        markedCount: 5
      });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.markedCount).toBe(5);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should soft delete a notification from user feed', async () => {
      jest.spyOn(notificationService, 'deleteNotification').mockResolvedValue({
        id: mockNotificationId,
        deleted: true
      });

      const res = await request(app)
        .delete(`/api/v1/notifications/${mockNotificationId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Preferences APIs', () => {
    it('GET /api/v1/notifications/preferences should return user notification preferences', async () => {
      jest.spyOn(notificationPreferenceService, 'getUserPreferences').mockResolvedValue({
        userId: mockCustomerId,
        channels: { email: true, sms: true, whatsapp: false, inApp: true },
        categories: { bookingUpdates: true, promotionalUpdates: false, securityAlerts: true },
        preferredLanguage: 'en'
      });

      const res = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.channels.email).toBe(true);
      expect(res.body.data.preferredLanguage).toBe('en');
    });

    it('PATCH /api/v1/notifications/preferences should update preferences successfully', async () => {
      jest.spyOn(notificationPreferenceService, 'updateUserPreferences').mockResolvedValue({
        userId: mockCustomerId,
        channels: { email: true, sms: false, whatsapp: true, inApp: true },
        categories: { bookingUpdates: true, promotionalUpdates: true, securityAlerts: true },
        preferredLanguage: 'hi',
        whatsappConsent: true
      });

      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          channels: { sms: false },
          categories: { promotionalUpdates: true },
          preferredLanguage: 'hi',
          whatsappConsent: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.channels.sms).toBe(false);
      expect(res.body.data.preferredLanguage).toBe('hi');
    });
  });

  describe('Admin Notification Management APIs', () => {
    it('POST /api/v1/admin/notifications/broadcast should queue announcement when requested by SUPER_ADMIN', async () => {
      jest.spyOn(adminNotificationService, 'broadcastAnnouncement').mockResolvedValue({
        broadcastBatchId: 'bcast_123',
        audience: 'ALL',
        recipientCount: 50,
        channels: ['IN_APP'],
        status: 'PROCESSING'
      });

      const res = await request(app)
        .post('/api/v1/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'System Maintenance',
          message: 'Maintenance scheduled tonight from 2 AM to 4 AM',
          audience: 'ALL',
          channels: ['IN_APP']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.broadcastBatchId).toBe('bcast_123');
      expect(res.body.data.recipientCount).toBe(50);
    });

    it('POST /api/v1/admin/notifications/broadcast should reject CUSTOMER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Unauthorized Broadcast',
          message: 'Trying to broadcast as customer'
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/admin/notifications/stats should return delivery statistics for Super Admin', async () => {
      jest.spyOn(adminNotificationService, 'getDeliveryStatistics').mockResolvedValue({
        byStatus: { SENT: 100, FAILED: 2 },
        byChannel: { EMAIL: 60, SMS: 40 }
      });

      const res = await request(app)
        .get('/api/v1/admin/notifications/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.byStatus.SENT).toBe(100);
    });
  });
});
