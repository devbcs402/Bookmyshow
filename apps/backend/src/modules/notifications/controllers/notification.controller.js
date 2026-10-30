import notificationService from '../services/notification.service.js';
import notificationPreferenceService from '../services/notification-preference.service.js';
import { ApiResponse } from '../../../common/responses/api-response.js';

export class NotificationController {
  /**
   * Retrieves notification feed for authenticated user.
   */
  async getNotifications(req, res, next) {
    try {
      const result = await notificationService.getUserNotifications(req.user.id, req.query);
      return ApiResponse.success(res, {
        data: result.items,
        message: 'Notifications retrieved successfully',
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
   * Retrieves unread notification count for authenticated user.
   */
  async getUnreadCount(req, res, next) {
    try {
      const unreadCount = await notificationService.getUserUnreadCount(req.user.id);
      return ApiResponse.success(res, {
        data: { unreadCount },
        message: 'Unread count retrieved successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.params.id, req.user.id);
      return ApiResponse.success(res, {
        data: result,
        message: 'Notification marked as read'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Marks all notifications as read for authenticated user.
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      return ApiResponse.success(res, {
        data: result,
        message: 'All notifications marked as read'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Soft deletes a notification from user feed.
   */
  async deleteNotification(req, res, next) {
    try {
      const result = await notificationService.deleteNotification(req.params.id, req.user.id);
      return ApiResponse.success(res, {
        data: result,
        message: 'Notification deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves notification preferences for authenticated user.
   */
  async getPreferences(req, res, next) {
    try {
      const preferences = await notificationPreferenceService.getUserPreferences(req.user.id);
      return ApiResponse.success(res, {
        data: preferences,
        message: 'Notification preferences retrieved successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates notification preferences for authenticated user.
   */
  async updatePreferences(req, res, next) {
    try {
      const updated = await notificationPreferenceService.updateUserPreferences(
        req.user.id,
        req.body
      );
      return ApiResponse.success(res, {
        data: updated,
        message: 'Notification preferences updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;

