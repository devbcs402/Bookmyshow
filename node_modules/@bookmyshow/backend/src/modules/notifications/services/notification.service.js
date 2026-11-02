import { User } from '../../users/model/user.model.js';
import notificationRepository from '../repositories/notification.repository.js';
import notificationTemplateRepository from '../repositories/notification-template.repository.js';
import notificationPreferenceService from './notification-preference.service.js';
import NotificationSocketService from './notification-socket.service.js';
import notificationQueueService from '../queues/notification-queue.service.js';
import TemplateEngine from '../templates/template.engine.js';
import emailProvider from '../providers/email/email.provider.js';
import smsProvider, { SmsProviderAdapter } from '../providers/sms/sms.provider.js';
import whatsAppProvider from '../providers/whatsapp/whatsapp.provider.js';
import {
  NotificationChannel,
  NotificationCategory,
  DeliveryStatus,
  NotificationProvider
} from '../constants/notification.constants.js';
import { AppError } from '../../../common/errors/app.error.js';
import { HttpStatus } from '../../../common/constants/http-status.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';
import logger from '../../../config/logger.js';

export class NotificationService {
  constructor() {
    // Bind queue worker handler to this service
    notificationQueueService.setDeliveryHandler(this.deliverJob.bind(this));
  }

  /**
   * Central entry point to dispatch notifications across enabled channels.
   *
   * @param {Object} params
   * @param {string} params.userId Recipient user ObjectId
   * @param {string} params.type NotificationType enum
   * @param {string} [params.category=NotificationCategory.TRANSACTIONAL]
   * @param {Array<string>} [params.channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL]]
   * @param {Object} [params.data={}] Dynamic template variables
   * @param {string} [params.idempotencyKey=null] Stable business event deduplication key
   * @param {string} [params.relatedEntityType=null] 'booking', 'payment', 'theatre', etc.
   * @param {string} [params.relatedEntityId=null]
   * @returns {Promise<Object>} Summary of created in-app notification and queued deliveries
   */
  async sendNotification({
    userId,
    type,
    category = NotificationCategory.TRANSACTIONAL,
    channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    data = {},
    idempotencyKey = null,
    relatedEntityType = null,
    relatedEntityId = null
  }) {
    // 1. Retrieve User Details
    const user = await User.findById(userId).select('name email phone role').lean();
    if (!user) {
      logger.warn({ userId }, 'Notification dispatch aborted: User does not exist');
      return { success: false, reason: 'USER_NOT_FOUND' };
    }

    // 2. Retrieve Preferences & Language
    const preferences = await notificationPreferenceService.getUserPreferences(userId);
    const language = preferences.preferredLanguage || 'en';

    // Merge recipient info into data context
    const templateContext = {
      customerName: user.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      ...data
    };

    let inAppDoc = null;
    const queuedDeliveries = [];

    // 3. Process In-App Notification if requested and permitted
    if (channels.includes(NotificationChannel.IN_APP)) {
      if (
        notificationPreferenceService.isChannelEnabledForCategory(
          preferences,
          NotificationChannel.IN_APP,
          category
        )
      ) {
        const inAppTemplate = await this._resolveTemplate(
          type,
          NotificationChannel.IN_APP,
          language
        );
        const title = TemplateEngine.render(
          inAppTemplate?.subject || data.title || type,
          templateContext
        );
        const message = TemplateEngine.render(
          inAppTemplate?.bodyTemplate || data.message || '',
          templateContext
        );

        inAppDoc = await notificationRepository.createNotification({
          userId,
          title,
          message,
          type,
          category,
          relatedEntityType,
          relatedEntityId,
          metadata: {
            ...data,
            bookingReference: data.bookingReference,
            ticketUrl: data.ticketUrl
          }
        });

        // Real-time Socket.IO emission to user's private room
        NotificationSocketService.emitNewNotification(userId, inAppDoc);
        const unreadCount = await notificationRepository.countUserUnread(userId);
        NotificationSocketService.emitUnreadCountUpdated(userId, unreadCount);
      }
    }

    // 4. Process External Delivery Channels (EMAIL, SMS, WHATSAPP)
    const externalChannels = channels.filter(c => c !== NotificationChannel.IN_APP);

    for (const channel of externalChannels) {
      // Check user preferences
      if (
        !notificationPreferenceService.isChannelEnabledForCategory(preferences, channel, category)
      ) {
        logger.debug(
          { userId, channel, category },
          'Channel skipped due to user preference settings'
        );
        continue;
      }

      // Check recipient availability
      const recipient = this._resolveRecipient(user, channel);
      if (!recipient) {
        logger.debug(
          { userId, channel },
          'Channel skipped: User lacks required recipient address/phone'
        );
        continue;
      }

      // Deduplication check
      const channelIdempotencyKey = idempotencyKey ? `${idempotencyKey}:${channel}` : null;
      if (channelIdempotencyKey) {
        const existingDelivery =
          await notificationRepository.findDeliveryByIdempotencyKey(channelIdempotencyKey);
        if (existingDelivery) {
          logger.info(
            { channelIdempotencyKey, status: existingDelivery.deliveryStatus },
            'Duplicate notification detected; skipping re-delivery'
          );
          queuedDeliveries.push({
            channel,
            deliveryId: existingDelivery._id,
            status: existingDelivery.deliveryStatus,
            duplicate: true
          });
          continue;
        }
      }

      // Render Template
      const template = await this._resolveTemplate(type, channel, language);
      const renderedSubject = template?.subject
        ? TemplateEngine.render(template.subject, templateContext)
        : null;
      const renderedBody = template?.bodyTemplate
        ? TemplateEngine.render(template.bodyTemplate, templateContext, channel === 'EMAIL')
        : '';
      const renderedPlainText = template?.plainTextTemplate
        ? TemplateEngine.render(template.plainTextTemplate, templateContext)
        : '';

      // Create Pending Delivery Record in Database
      const delivery = await notificationRepository.createDelivery({
        notificationId: inAppDoc?._id || null,
        userId,
        channel,
        provider: this._resolveProviderForChannel(channel),
        recipient:
          channel === NotificationChannel.SMS ? SmsProviderAdapter.maskPhone(recipient) : recipient,
        deliveryStatus: DeliveryStatus.QUEUED,
        idempotencyKey: channelIdempotencyKey,
        metadata: {
          type,
          category,
          language
        }
      });

      // Enqueue job into background queue
      await notificationQueueService.enqueue({
        deliveryId: delivery._id.toString(),
        userId: userId.toString(),
        channel,
        recipient, // full unmasked recipient for actual network dispatch
        subject: renderedSubject,
        body: renderedBody,
        plainText: renderedPlainText,
        templateName: template?.whatsappTemplateName,
        languageCode: language,
        data: templateContext,
        hasConsent: preferences.whatsappConsent || false
      });

      queuedDeliveries.push({
        channel,
        deliveryId: delivery._id,
        status: DeliveryStatus.QUEUED
      });
    }

    return {
      success: true,
      inAppNotificationId: inAppDoc?._id || null,
      queuedDeliveries
    };
  }

  /**
   * Worker callback that delivers an enqueued notification job.
   *
   * @param {Object} job
   * @returns {Promise<boolean>}
   */
  async deliverJob(job) {
    const {
      deliveryId,
      channel,
      recipient,
      subject,
      body,
      plainText,
      templateName,
      languageCode,
      data,
      hasConsent,
      attemptCount = 0
    } = job;

    const delivery = await notificationRepository.findDeliveryById(deliveryId);
    if (!delivery) {
      logger.warn({ deliveryId }, 'Delivery record not found for enqueued job');
      return false;
    }

    // Idempotency guard: Don't re-deliver already sent jobs
    if (
      delivery.deliveryStatus === DeliveryStatus.SENT ||
      delivery.deliveryStatus === DeliveryStatus.DELIVERED
    ) {
      logger.info({ deliveryId }, 'Job already in terminal success state; skipping');
      return true;
    }

    // Mark as PROCESSING
    await notificationRepository.updateDelivery(deliveryId, {
      deliveryStatus: DeliveryStatus.PROCESSING
    });

    let result = { success: false, error: 'Unknown provider outcome' };

    try {
      if (channel === NotificationChannel.EMAIL) {
        result = await emailProvider.sendEmail({
          to: recipient,
          subject: subject || 'BookMyShow Notification',
          html: body,
          text: plainText
        });
      } else if (channel === NotificationChannel.SMS) {
        result = await smsProvider.sendSms({
          to: recipient,
          message: body
        });
      } else if (channel === NotificationChannel.WHATSAPP) {
        result = await whatsAppProvider.sendMessage({
          to: recipient,
          templateName: templateName || 'bms_notification',
          languageCode: languageCode || 'en',
          parameters: Object.entries(data || {}).map(([key, val]) => ({
            type: 'text',
            text: `${key}: ${val}`
          })),
          fallbackText: body,
          hasConsent
        });
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }

    // Handle Dispatch Result
    if (result.success) {
      await notificationRepository.updateDelivery(deliveryId, {
        deliveryStatus: DeliveryStatus.SENT,
        provider: result.provider || delivery.provider,
        providerMessageId: result.messageId || null,
        sentAt: new Date(),
        lastError: null
      });
      logger.info(
        { deliveryId, channel, provider: result.provider },
        'Notification successfully dispatched'
      );
      return true;
    } else {
      const nextAttempt = attemptCount + 1;
      const maxAttempts = delivery.maxAttempts || 3;

      if (nextAttempt < maxAttempts) {
        const nextRetryDate = await notificationQueueService.scheduleRetry(
          job,
          nextAttempt,
          result.error
        );
        await notificationRepository.appendRetryHistory(deliveryId, {
          attempt: nextAttempt,
          error: result.error,
          nextRetryAt: nextRetryDate
        });
        logger.warn(
          {
            deliveryId,
            channel,
            attempt: nextAttempt,
            error: result.error
          },
          'Notification delivery failed; retry scheduled'
        );
      } else {
        // Max retries exhausted -> Permanently Failed
        await notificationRepository.updateDelivery(deliveryId, {
          deliveryStatus: DeliveryStatus.PERMANENTLY_FAILED,
          lastError: result.error
        });
        await notificationQueueService.routeToDeadLetter(job, result.error);
        logger.error(
          { deliveryId, channel, error: result.error },
          'Notification delivery permanently failed'
        );
      }
      return false;
    }
  }

  // ===========================================================================
  // Customer Feed Management
  // ===========================================================================

  async getUserNotifications(userId, options) {
    return notificationRepository.findUserNotifications(userId, options);
  }

  async getUserUnreadCount(userId) {
    return notificationRepository.countUserUnread(userId);
  }

  async markAsRead(notificationId, userId) {
    const notification = await notificationRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw new AppError(
        'Notification not found or access denied',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOTIFICATION_NOT_FOUND
      );
    }

    // Emit Socket.IO read update and unread count
    NotificationSocketService.emitNotificationRead(userId, notificationId);
    const unreadCount = await notificationRepository.countUserUnread(userId);
    NotificationSocketService.emitUnreadCountUpdated(userId, unreadCount);

    return notification.toObject ? notification.toObject() : notification;
  }

  async markAllAsRead(userId) {
    const count = await notificationRepository.markAllAsRead(userId);
    NotificationSocketService.emitUnreadCountUpdated(userId, 0);
    return { markedCount: count };
  }

  async deleteNotification(notificationId, userId) {
    const notification = await notificationRepository.deleteNotification(notificationId, userId);
    if (!notification) {
      throw new AppError(
        'Notification not found or access denied',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOTIFICATION_NOT_FOUND
      );
    }

    const unreadCount = await notificationRepository.countUserUnread(userId);
    NotificationSocketService.emitUnreadCountUpdated(userId, unreadCount);

    return { id: notificationId, deleted: true };
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  async _resolveTemplate(templateKey, channel, language) {
    // 1. Try fetching custom database template
    const dbTemplate = await notificationTemplateRepository.findByKeyAndChannel(
      templateKey,
      channel,
      language
    );
    if (dbTemplate) {
      return dbTemplate;
    }

    // 2. Fall back to built-in default templates
    return TemplateEngine.getDefaultTemplate(templateKey, channel, language);
  }

  _resolveRecipient(user, channel) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return user.email || null;
      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        return user.phone || null;
      default:
        return null;
    }
  }

  _resolveProviderForChannel(channel) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return emailProvider._resolveProviderName();
      case NotificationChannel.SMS:
        return smsProvider._resolveProviderName();
      case NotificationChannel.WHATSAPP:
        return whatsAppProvider._resolveProviderName();
      default:
        return NotificationProvider.IN_APP_DB;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
