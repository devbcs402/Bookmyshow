import { getSocketIO } from '../../../sockets/index.js';
import { SocketEvents } from '../../../sockets/events.js';
import logger from '../../../config/logger.js';

export class NotificationSocketService {
  /**
   * Safely retrieves the initialized Socket.IO instance or null.
   * @private
   */
  static _getIO() {
    try {
      return getSocketIO();
    } catch (_err) {
      return null;
    }
  }

  /**
   * Emits a 'notification:new' event to the user's private notification room.
   *
   * @param {string} userId
   * @param {Object} notification
   */
  static emitNewNotification(userId, notification) {
    const io = this._getIO();
    if (!io) {
      return;
    }

    const room = `user:${userId.toString()}`;
    io.to(room).emit(SocketEvents.NOTIFICATION_NEW, {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    });

    logger.debug({ userId, room }, 'Real-time notification:new emitted');
  }

  /**
   * Emits a 'notification:read' event to the user's private notification room.
   *
   * @param {string} userId
   * @param {string} notificationId
   */
  static emitNotificationRead(userId, notificationId) {
    const io = this._getIO();
    if (!io) {
      return;
    }

    const room = `user:${userId.toString()}`;
    io.to(room).emit(SocketEvents.NOTIFICATION_READ, {
      notificationId: notificationId.toString()
    });

    logger.debug({ userId, notificationId, room }, 'Real-time notification:read emitted');
  }

  /**
   * Emits an updated unread count to the user's private room.
   *
   * @param {string} userId
   * @param {number} unreadCount
   */
  static emitUnreadCountUpdated(userId, unreadCount) {
    const io = this._getIO();
    if (!io) {
      return;
    }

    const room = `user:${userId.toString()}`;
    io.to(room).emit(SocketEvents.NOTIFICATION_UNREAD_COUNT_UPDATED, {
      unreadCount
    });

    logger.debug({ userId, unreadCount, room }, 'Real-time unread count updated');
  }
}

export default NotificationSocketService;
