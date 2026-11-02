import notificationPreferenceRepository from '../repositories/notification-preference.repository.js';
import {
  NotificationChannel,
  NotificationCategory,
  SupportedLanguages
} from '../constants/notification.constants.js';
import { AppError } from '../../../common/errors/app.error.js';
import { HttpStatus } from '../../../common/constants/http-status.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class NotificationPreferenceService {
  /**
   * Retrieves user preferences with automatic default fallback.
   *
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getUserPreferences(userId) {
    const existing = await notificationPreferenceRepository.findByUserId(userId);
    if (existing) {
      return existing.toObject ? existing.toObject() : existing;
    }

    // Default preference set if user has not customized settings yet
    return {
      userId,
      channels: {
        email: true,
        sms: true,
        whatsapp: false,
        inApp: true
      },
      categories: {
        bookingUpdates: true,
        paymentUpdates: true,
        promotionalUpdates: false,
        securityAlerts: true
      },
      preferredLanguage: SupportedLanguages.EN,
      whatsappConsent: false,
      whatsappConsentAt: null
    };
  }

  /**
   * Updates user preferences with strict security invariants.
   *
   * @param {string} userId
   * @param {Object} updatePayload
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(userId, updatePayload) {
    // Invariant: Security alerts cannot be disabled under platform policy
    if (updatePayload.categories && updatePayload.categories.securityAlerts === false) {
      throw new AppError(
        'Account security alerts are mandatory and cannot be disabled',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const updateDoc = {};

    if (updatePayload.channels) {
      if (updatePayload.channels.email !== undefined) {
        updateDoc['channels.email'] = Boolean(updatePayload.channels.email);
      }
      if (updatePayload.channels.sms !== undefined) {
        updateDoc['channels.sms'] = Boolean(updatePayload.channels.sms);
      }
      if (updatePayload.channels.whatsapp !== undefined) {
        updateDoc['channels.whatsapp'] = Boolean(updatePayload.channels.whatsapp);
      }
      if (updatePayload.channels.inApp !== undefined) {
        updateDoc['channels.inApp'] = Boolean(updatePayload.channels.inApp);
      }
    }

    if (updatePayload.categories) {
      if (updatePayload.categories.bookingUpdates !== undefined) {
        updateDoc['categories.bookingUpdates'] = Boolean(updatePayload.categories.bookingUpdates);
      }
      if (updatePayload.categories.paymentUpdates !== undefined) {
        updateDoc['categories.paymentUpdates'] = Boolean(updatePayload.categories.paymentUpdates);
      }
      if (updatePayload.categories.promotionalUpdates !== undefined) {
        updateDoc['categories.promotionalUpdates'] = Boolean(
          updatePayload.categories.promotionalUpdates
        );
      }
    }

    if (updatePayload.preferredLanguage) {
      if (!Object.values(SupportedLanguages).includes(updatePayload.preferredLanguage)) {
        throw new AppError(
          `Unsupported language: ${updatePayload.preferredLanguage}. Supported: ${Object.values(SupportedLanguages).join(', ')}`,
          HttpStatus.BAD_REQUEST,
          ErrorCodes.VALIDATION_ERROR
        );
      }
      updateDoc.preferredLanguage = updatePayload.preferredLanguage;
    }

    // WhatsApp opt-in consent management
    if (updatePayload.whatsappConsent !== undefined) {
      const consentGiven = Boolean(updatePayload.whatsappConsent);
      updateDoc.whatsappConsent = consentGiven;
      updateDoc.whatsappConsentAt = consentGiven ? new Date() : null;
      if (consentGiven) {
        updateDoc['channels.whatsapp'] = true;
      }
    }

    const saved = await notificationPreferenceRepository.upsertPreferences(userId, updateDoc);
    return saved.toObject ? saved.toObject() : saved;
  }

  /**
   * Evaluates whether a notification can be delivered over a given channel based on preferences.
   *
   * @param {Object} preferences
   * @param {string} channel EMAIL | SMS | WHATSAPP | IN_APP
   * @param {string} category TRANSACTIONAL | MARKETING | SECURITY | SYSTEM
   * @returns {boolean}
   */
  isChannelEnabledForCategory(preferences, channel, category) {
    if (!preferences) {
      return true;
    }

    // 1. Mandatory Security & System alerts override category toggles
    if (category === NotificationCategory.SECURITY || category === NotificationCategory.SYSTEM) {
      // Security messages always deliver if the channel is technically valid
      return true;
    }

    // 2. Promotional / Marketing Consent Check
    if (category === NotificationCategory.MARKETING) {
      if (!preferences.categories?.promotionalUpdates) {
        return false;
      }
    }

    // 3. Category Level Check for Transactional (Bookings / Payments)
    if (category === NotificationCategory.TRANSACTIONAL) {
      // Default to true if not explicitly disabled
      if (preferences.categories?.bookingUpdates === false) {
        return false;
      }
    }

    // 4. Channel Level Check
    const channelKey = channel.toLowerCase();
    const isChannelEnabled = preferences.channels
      ? preferences.channels[channelKey] !== false
      : true;

    // 5. Extra WhatsApp explicit opt-in requirement
    if (channel === NotificationChannel.WHATSAPP) {
      return isChannelEnabled && Boolean(preferences.whatsappConsent);
    }

    return isChannelEnabled;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
export default notificationPreferenceService;
