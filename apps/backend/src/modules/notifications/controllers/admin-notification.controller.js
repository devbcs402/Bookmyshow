import adminNotificationService from '../services/admin-notification.service.js';
import notificationService from '../services/notification.service.js';
import { ApiResponse } from '../../../common/responses/api-response.js';

export class AdminNotificationController {
  /**
   * Broadcasts a platform announcement to an audience segment.
   */
  async broadcastAnnouncement(req, res, next) {
    try {
      const result = await adminNotificationService.broadcastAnnouncement(
        req.user,
        req.body,
        notificationService
      );
      return ApiResponse.created(res, {
        data: result,
        message: 'Platform announcement broadcast queued successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists all platform notifications with filters and pagination.
   */
  async listAllNotifications(req, res, next) {
    try {
      const result = await adminNotificationService.listAllNotifications(req.query);
      return ApiResponse.success(res, {
        data: result.items,
        message: 'Platform notifications retrieved successfully',
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves notification details and delivery records.
   */
  async getNotificationDetails(req, res, next) {
    try {
      const result = await adminNotificationService.getNotificationDetails(req.params.id);
      return ApiResponse.success(res, {
        data: result,
        message: 'Notification details retrieved successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves platform delivery statistics.
   */
  async getDeliveryStats(_req, res, next) {
    try {
      const stats = await adminNotificationService.getDeliveryStatistics();
      return ApiResponse.success(res, {
        data: stats,
        message: 'Notification delivery statistics retrieved successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminNotificationController = new AdminNotificationController();
export default adminNotificationController;

