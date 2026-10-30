import mongoose from 'mongoose';
import {
  NotificationChannel,
  NotificationProvider,
  DeliveryStatus,
  NotificationDefaults
} from '../constants/notification.constants.js';

const retryHistorySchema = new mongoose.Schema(
  {
    attempt: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    error: { type: String, default: null }
  },
  { _id: false }
);

const notificationDeliverySchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'notifications',
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
      index: true
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: [true, 'Delivery channel is required']
    },
    provider: {
      type: String,
      enum: Object.values(NotificationProvider),
      required: [true, 'Notification provider is required']
    },
    providerMessageId: {
      type: String,
      default: null,
      trim: true
    },
    recipient: {
      type: String,
      required: [true, 'Recipient identifier is required'],
      trim: true
    },
    deliveryStatus: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.QUEUED,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: NotificationDefaults.MAX_RETRIES
    },
    lastError: {
      type: String,
      default: null
    },
    retryHistory: {
      type: [retryHistorySchema],
      default: () => []
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true
    },
    sentAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Unique compound index on idempotencyKey to prevent duplicate deliveries per channel
notificationDeliverySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Index for delivery history and analytics
notificationDeliverySchema.index({ userId: 1, channel: 1, createdAt: -1 });

// Index for scheduled retry worker
notificationDeliverySchema.index({ deliveryStatus: 1, nextRetryAt: 1 });

// TTL retention for 90 days
notificationDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const NotificationDelivery = mongoose.model(
  'notification_deliveries',
  notificationDeliverySchema
);
export default NotificationDelivery;

