import { jest } from '@jest/globals';
import notificationPreferenceService from '../../src/modules/notifications/services/notification-preference.service.js';
import notificationPreferenceRepository from '../../src/modules/notifications/repositories/notification-preference.repository.js';
import {
  NotificationChannel,
  NotificationCategory,
  SupportedLanguages
} from '../../src/modules/notifications/constants/notification.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('NotificationPreferenceService Unit Tests', () => {
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c001';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return default preferences when no custom settings exist', async () => {
      jest.spyOn(notificationPreferenceRepository, 'findByUserId').mockResolvedValue(null);

      const prefs = await notificationPreferenceService.getUserPreferences(mockUserId);
      expect(prefs.userId).toBe(mockUserId);
      expect(prefs.channels.email).toBe(true);
      expect(prefs.channels.sms).toBe(true);
      expect(prefs.channels.whatsapp).toBe(false);
      expect(prefs.channels.inApp).toBe(true);
      expect(prefs.categories.bookingUpdates).toBe(true);
      expect(prefs.categories.promotionalUpdates).toBe(false);
      expect(prefs.categories.securityAlerts).toBe(true);
      expect(prefs.preferredLanguage).toBe(SupportedLanguages.EN);
    });

    it('should return existing preferences if present in database', async () => {
      const existing = {
        userId: mockUserId,
        channels: { email: false, sms: true, whatsapp: true, inApp: true },
        categories: {
          bookingUpdates: true,
          paymentUpdates: true,
          promotionalUpdates: true,
          securityAlerts: true
        },
        preferredLanguage: SupportedLanguages.HI,
        whatsappConsent: true,
        whatsappConsentAt: new Date()
      };
      jest.spyOn(notificationPreferenceRepository, 'findByUserId').mockResolvedValue(existing);

      const prefs = await notificationPreferenceService.getUserPreferences(mockUserId);
      expect(prefs.channels.email).toBe(false);
      expect(prefs.preferredLanguage).toBe(SupportedLanguages.HI);
      expect(prefs.whatsappConsent).toBe(true);
    });
  });

  describe('updateUserPreferences', () => {
    it('should reject disabling security alerts with AppError', async () => {
      await expect(
        notificationPreferenceService.updateUserPreferences(mockUserId, {
          categories: { securityAlerts: false }
        })
      ).rejects.toThrow(AppError);
    });

    it('should successfully update channel and category preferences', async () => {
      const updatedDoc = {
        userId: mockUserId,
        channels: { email: true, sms: false, whatsapp: false, inApp: true },
        categories: {
          bookingUpdates: true,
          paymentUpdates: true,
          promotionalUpdates: true,
          securityAlerts: true
        },
        preferredLanguage: SupportedLanguages.GU
      };
      jest
        .spyOn(notificationPreferenceRepository, 'upsertPreferences')
        .mockResolvedValue(updatedDoc);

      const result = await notificationPreferenceService.updateUserPreferences(mockUserId, {
        channels: { sms: false },
        categories: { promotionalUpdates: true },
        preferredLanguage: SupportedLanguages.GU
      });

      expect(result.channels.sms).toBe(false);
      expect(result.categories.promotionalUpdates).toBe(true);
      expect(result.preferredLanguage).toBe(SupportedLanguages.GU);
    });

    it('should enable WhatsApp channel automatically when consent is granted', async () => {
      let capturedDoc = null;
      jest
        .spyOn(notificationPreferenceRepository, 'upsertPreferences')
        .mockImplementation((_userId, doc) => {
          capturedDoc = doc;
          return Promise.resolve(doc);
        });

      await notificationPreferenceService.updateUserPreferences(mockUserId, {
        whatsappConsent: true
      });

      expect(capturedDoc.whatsappConsent).toBe(true);
      expect(capturedDoc.whatsappConsentAt).toBeInstanceOf(Date);
      expect(capturedDoc['channels.whatsapp']).toBe(true);
    });
  });

  describe('isChannelEnabledForCategory', () => {
    const defaultPrefs = {
      channels: { email: true, sms: true, whatsapp: true, inApp: true },
      categories: {
        bookingUpdates: true,
        paymentUpdates: true,
        promotionalUpdates: false,
        securityAlerts: true
      },
      whatsappConsent: true
    };

    it('should always permit SECURITY category notifications regardless of category toggles', () => {
      const disabledCategoryPrefs = {
        ...defaultPrefs,
        categories: { bookingUpdates: false, promotionalUpdates: false, securityAlerts: true }
      };
      const allowed = notificationPreferenceService.isChannelEnabledForCategory(
        disabledCategoryPrefs,
        NotificationChannel.EMAIL,
        NotificationCategory.SECURITY
      );
      expect(allowed).toBe(true);
    });

    it('should disallow MARKETING notifications if promotionalUpdates is false', () => {
      const allowed = notificationPreferenceService.isChannelEnabledForCategory(
        defaultPrefs,
        NotificationChannel.EMAIL,
        NotificationCategory.MARKETING
      );
      expect(allowed).toBe(false);
    });

    it('should disallow WhatsApp if user has not granted explicit opt-in consent', () => {
      const noConsentPrefs = {
        ...defaultPrefs,
        whatsappConsent: false
      };
      const allowed = notificationPreferenceService.isChannelEnabledForCategory(
        noConsentPrefs,
        NotificationChannel.WHATSAPP,
        NotificationCategory.TRANSACTIONAL
      );
      expect(allowed).toBe(false);
    });

    it('should allow WhatsApp for transactional alerts when consent is true and channel enabled', () => {
      const allowed = notificationPreferenceService.isChannelEnabledForCategory(
        defaultPrefs,
        NotificationChannel.WHATSAPP,
        NotificationCategory.TRANSACTIONAL
      );
      expect(allowed).toBe(true);
    });
  });
});
