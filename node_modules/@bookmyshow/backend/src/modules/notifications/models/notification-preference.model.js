import mongoose from 'mongoose';
import { SupportedLanguages } from '../constants/notification.constants.js';

const channelPreferenceSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  { _id: false }
);

const categoryPreferenceSchema = new mongoose.Schema(
  {
    bookingUpdates: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    promotionalUpdates: { type: Boolean, default: false },
    securityAlerts: {
      type: Boolean,
      default: true,
      // Security alerts cannot be disabled under platform policy
      immutable: true
    }
  },
  { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    channels: {
      type: channelPreferenceSchema,
      default: () => ({})
    },
    categories: {
      type: categoryPreferenceSchema,
      default: () => ({})
    },
    preferredLanguage: {
      type: String,
      enum: Object.values(SupportedLanguages),
      default: SupportedLanguages.EN
    },
    whatsappConsent: {
      type: Boolean,
      default: false
    },
    whatsappConsentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const NotificationPreference = mongoose.model(
  'notification_preferences',
  notificationPreferenceSchema
);
export default NotificationPreference;
