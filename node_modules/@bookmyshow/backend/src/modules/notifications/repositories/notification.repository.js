import Notification from '../models/notification.model.js';
import NotificationDelivery from '../models/notification-delivery.model.js';
import { DeliveryStatus } from '../constants/notification.constants.js';

export class NotificationRepository {
  // ===========================================================================
  // In-App Notifications
  // ===========================================================================

  async createNotification(notificationData) {
    return Notification.create(notificationData);
  }

  async findById(notificationId) {
    return Notification.findOne({ _id: notificationId, isDeleted: false });
  }

  async findUserNotifications(userId, { isRead, type, category, page = 1, limit = 20 } = {}) {
    const filter = {
      userId,
      isDeleted: false
    };

    if (isRead !== undefined && isRead !== null) {
      filter.isRead = isRead === true || isRead === 'true';
    }

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter)
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async countUserUnread(userId) {
    return Notification.countDocuments({
      userId,
      isRead: false,
      isDeleted: false
    });
  }

  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId, isDeleted: false },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false, isDeleted: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return result.modifiedCount;
  }

  async deleteNotification(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
  }

  // ===========================================================================
  // Delivery Ledger
  // ===========================================================================

  async createDelivery(deliveryData) {
    return NotificationDelivery.create(deliveryData);
  }

  async findDeliveryById(deliveryId) {
    return NotificationDelivery.findById(deliveryId);
  }

  async findDeliveryByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) {
      return null;
    }
    return NotificationDelivery.findOne({ idempotencyKey });
  }

  async updateDelivery(deliveryId, updateData) {
    return NotificationDelivery.findByIdAndUpdate(deliveryId, { $set: updateData }, { new: true });
  }

  async appendRetryHistory(deliveryId, { attempt, error, nextRetryAt }) {
    return NotificationDelivery.findByIdAndUpdate(
      deliveryId,
      {
        $set: {
          attemptCount: attempt,
          lastError: error,
          nextRetryAt,
          deliveryStatus: DeliveryStatus.RETRYING
        },
        $push: {
          retryHistory: {
            attempt,
            timestamp: new Date(),
            error
          }
        }
      },
      { new: true }
    );
  }

  async findDeliveriesByNotificationId(notificationId) {
    return NotificationDelivery.find({ notificationId }).lean();
  }

  async listAllNotifications({ page = 1, limit = 20, type, category } = {}) {
    const filter = { isDeleted: false };
    if (type) {
      filter.type = type;
    }
    if (category) {
      filter.category = category;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .populate('userId', 'name email phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getDeliveryStats() {
    const [statusCounts, channelCounts] = await Promise.all([
      NotificationDelivery.aggregate([
        {
          $group: {
            _id: '$deliveryStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      NotificationDelivery.aggregate([
        {
          $group: {
            _id: '$channel',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      byStatus: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byChannel: channelCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;
