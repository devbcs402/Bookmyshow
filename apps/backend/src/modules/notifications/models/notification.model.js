import mongoose from 'mongoose';
import {
  NotificationType,
  NotificationCategory,
  NotificationDefaults
} from '../constants/notification.constants.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required']
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.TRANSACTIONAL,
      required: true
    },
    relatedEntityType: {
      type: String,
      trim: true,
      default: null
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for user feed and unread count queries
notificationSchema.index({ userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 });

// TTL index to automatically purge old in-app notifications after 60 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NotificationDefaults.IN_APP_TTL_DAYS * 24 * 60 * 60 }
);

export const Notification = mongoose.model('notifications', notificationSchema);
export default Notification;

