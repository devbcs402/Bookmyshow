import { z } from 'zod';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  SupportedLanguages
} from '../constants/notification.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .regex(objectIdRegex, 'Must be a valid 24-character hexadecimal ObjectId');

export const getNotificationsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z.enum(['true', 'false']).optional(),
    type: z.nativeEnum(NotificationType).optional(),
    category: z.nativeEnum(NotificationCategory).optional()
  })
};

export const notificationIdParamSchema = {
  params: z.object({
    id: objectIdSchema
  })
};

export const updatePreferencesSchema = {
  body: z.object({
    channels: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        inApp: z.boolean().optional()
      })
      .optional(),
    categories: z
      .object({
        bookingUpdates: z.boolean().optional(),
        paymentUpdates: z.boolean().optional(),
        promotionalUpdates: z.boolean().optional()
      })
      .optional(),
    preferredLanguage: z.nativeEnum(SupportedLanguages).optional(),
    whatsappConsent: z.boolean().optional()
  })
};

export const broadcastAnnouncementSchema = {
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(120),
    message: z.string().min(5, 'Message must be at least 5 characters').max(1000),
    audience: z.enum(['ALL', 'CUSTOMERS', 'THEATRE_OWNERS']).default('ALL'),
    channels: z
      .array(z.nativeEnum(NotificationChannel))
      .min(1, 'At least one delivery channel is required')
      .default([NotificationChannel.IN_APP])
  })
};

export const adminListNotificationsSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.nativeEnum(NotificationType).optional(),
    category: z.nativeEnum(NotificationCategory).optional()
  })
};

export default {
  getNotificationsSchema,
  notificationIdParamSchema,
  updatePreferencesSchema,
  broadcastAnnouncementSchema,
  adminListNotificationsSchema
};
