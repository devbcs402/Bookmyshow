import { User } from '../../users/model/user.model.js';
import { Roles } from '../../auth/auth.constants.js';
import notificationRepository from '../repositories/notification.repository.js';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel
} from '../constants/notification.constants.js';
import { AppError } from '../../../common/errors/app.error.js';
import { HttpStatus } from '../../../common/constants/http-status.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';
import logger from '../../../config/logger.js';

export class AdminNotificationService {
  /**
   * Broadcasts an administrative platform announcement to an audience segment.
   *
   * @param {Object} actor Authenticated user
   * @param {Object} broadcastData
   * @param {string} broadcastData.title
   * @param {string} broadcastData.message
   * @param {string} [broadcastData.audience='ALL'] ALL | CUSTOMERS | THEATRE_OWNERS
   * @param {Array<string>} [broadcastData.channels=['IN_APP']]
   * @param {Object} notificationService Central NotificationService instance
   * @returns {Promise<Object>} Broadcast outcome
   */
  async broadcastAnnouncement(actor, broadcastData, notificationService) {
    if (actor.role !== Roles.SUPER_ADMIN) {
      throw new AppError(
        'Only Super Administrators can broadcast platform announcements',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    const {
      title,
      message,
      audience = 'ALL',
      channels = [NotificationChannel.IN_APP]
    } = broadcastData;

    if (!title || !message) {
      throw new AppError(
        'Broadcast title and message are required',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Resolve audience filter
    const userFilter = { isActive: true, deletedAt: null };
    if (audience === 'CUSTOMERS') {
      userFilter.role = Roles.CUSTOMER;
    } else if (audience === 'THEATRE_OWNERS') {
      userFilter.role = { $in: [Roles.THEATRE_OWNER, Roles.THEATRE_MANAGER] };
    } else if (audience !== 'ALL') {
      throw new AppError(
        `Invalid target audience: ${audience}. Supported: ALL, CUSTOMERS, THEATRE_OWNERS`,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.BROADCAST_AUDIENCE_INVALID
      );
    }

    const recipients = await User.find(userFilter).select('_id name email phone role').lean();

    logger.info(
      {
        adminId: actor.id,
        audience,
        recipientCount: recipients.length,
        channels
      },
      'Initiating platform announcement broadcast'
    );

    // Asynchronously dispatch notifications in background
    let queuedCount = 0;
    const broadcastBatchId = `broadcast_${Date.now()}`;

    // Process asynchronously without blocking API response
    setImmediate(async () => {
      for (const recipient of recipients) {
        try {
          await notificationService.sendNotification({
            userId: recipient._id,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            category: NotificationCategory.SYSTEM,
            channels,
            data: {
              title,
              message,
              name: recipient.name
            },
            idempotencyKey: `idemp:${broadcastBatchId}:${recipient._id}`
          });
          queuedCount++;
        } catch (err) {
          logger.warn(
            { err: err.message, recipientId: recipient._id },
            'Failed to dispatch broadcast to recipient'
          );
        }
      }
      logger.info(
        { broadcastBatchId, totalDispatched: queuedCount },
        'Platform announcement broadcast completed'
      );
    });

    return {
      broadcastBatchId,
      audience,
      recipientCount: recipients.length,
      channels,
      status: 'PROCESSING'
    };
  }

  /**
   * Retrieves all platform notifications with pagination and filters.
   */
  async listAllNotifications(options) {
    return notificationRepository.listAllNotifications(options);
  }

  /**
   * Retrieves notification details and per-channel delivery history.
   */
  async getNotificationDetails(notificationId) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new AppError(
        'Notification not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOTIFICATION_NOT_FOUND
      );
    }

    const deliveries = await notificationRepository.findDeliveriesByNotificationId(notificationId);

    return {
      notification: notification.toObject ? notification.toObject() : notification,
      deliveries
    };
  }

  /**
   * Retrieves aggregated platform delivery metrics.
   */
  async getDeliveryStatistics() {
    return notificationRepository.getDeliveryStats();
  }
}

export const adminNotificationService = new AdminNotificationService();
export default adminNotificationService;

