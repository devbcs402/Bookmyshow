import mongoose from 'mongoose';
import {
  NotificationChannel,
  NotificationType,
  SupportedLanguages
} from '../constants/notification.constants.js';

const notificationTemplateSchema = new mongoose.Schema(
  {
    templateKey: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Template key is required'],
      index: true
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: [true, 'Channel is required']
    },
    language: {
      type: String,
      enum: Object.values(SupportedLanguages),
      default: SupportedLanguages.EN,
      required: true
    },
    subject: {
      type: String,
      default: null,
      trim: true
    },
    bodyTemplate: {
      type: String,
      required: [true, 'Body template is required']
    },
    plainTextTemplate: {
      type: String,
      default: null
    },
    whatsappTemplateName: {
      type: String,
      default: null,
      trim: true
    },
    whatsappNamespace: {
      type: String,
      default: null,
      trim: true
    },
    variables: {
      type: [String],
      default: () => []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index ensuring one template version per key, channel, and language
notificationTemplateSchema.index({ templateKey: 1, channel: 1, language: 1 }, { unique: true });

export const NotificationTemplate = mongoose.model(
  'notification_templates',
  notificationTemplateSchema
);
export default NotificationTemplate;
