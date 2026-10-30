import env from '../../../../config/env.js';
import logger from '../../../../config/logger.js';
import { NotificationProvider } from '../../constants/notification.constants.js';
import { SmsProviderAdapter } from '../sms/sms.provider.js';

export class WhatsAppProviderAdapter {
  constructor() {
    this.providerType = env.WHATSAPP_PROVIDER;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN;
  }

  /**
   * Formats a phone number for the WhatsApp Business API (digits only, e.g., '919876543210').
   * @param {string} phone
   * @returns {string}
   */
  static formatWhatsAppRecipient(phone) {
    if (!phone) {
      return '';
    }
    return phone.replace(/[^\d]/g, '');
  }

  /**
   * Dispatches a WhatsApp message using Meta's official WhatsApp Business Cloud API.
   *
   * @param {Object} options
   * @param {string} options.to Recipient phone number (E.164)
   * @param {string} options.templateName Approved Meta WhatsApp template name (e.g. 'bms_booking_confirmed')
   * @param {string} [options.languageCode='en'] Template language code
   * @param {Array<{ type: string, text: string }>} [options.parameters=[]] Dynamic template variables
   * @param {string} [options.fallbackText=''] Fallback text message
   * @param {boolean} [options.hasConsent=false] Whether user has explicitly opted-in to WhatsApp alerts
   * @returns {Promise<{ success: boolean, provider: string, messageId: string, error?: string }>}
   */
  async sendMessage({
    to,
    templateName,
    languageCode = 'en',
    parameters = [],
    fallbackText = '',
    hasConsent = false
  }) {
    if (!to || !SmsProviderAdapter.isValidPhone(to)) {
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: `Invalid phone number for WhatsApp: ${SmsProviderAdapter.maskPhone(to)}`
      };
    }

    if (!hasConsent) {
      logger.warn(
        { recipient: SmsProviderAdapter.maskPhone(to) },
        'WhatsApp dispatch skipped: User has not opted into WhatsApp notifications'
      );
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: 'User has not opted-in to receive WhatsApp notifications'
      };
    }

    // Test environment or Mock provider
    if (env.NODE_ENV === 'test' || this.providerType === 'mock') {
      logger.debug(
        { recipient: SmsProviderAdapter.maskPhone(to), templateName },
        'Mock WhatsApp message dispatched successfully'
      );
      return {
        success: true,
        provider: NotificationProvider.MOCK_WHATSAPP,
        messageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
    }

    try {
      if (this.providerType === 'whatsapp_cloud' && this.phoneNumberId && this.accessToken) {
        return await this._sendViaCloudApi({
          to,
          templateName,
          languageCode,
          parameters,
          fallbackText
        });
      }

      // Default mock fallback
      return {
        success: true,
        provider: NotificationProvider.MOCK_WHATSAPP,
        messageId: `mock_wa_${Date.now()}`
      };
    } catch (err) {
      logger.error(
        { err: err.message, recipient: SmsProviderAdapter.maskPhone(to) },
        'WhatsApp dispatch failed at provider level'
      );
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: err.message
      };
    }
  }

  /**
   * Internal HTTP call to Meta WhatsApp Cloud API endpoint.
   * @private
   */
  async _sendViaCloudApi({ to, templateName, languageCode, parameters, fallbackText }) {
    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const recipientPhone = WhatsAppProviderAdapter.formatWhatsAppRecipient(to);

    let payload;
    if (templateName) {
      payload = {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components:
            parameters.length > 0
              ? [
                  {
                    type: 'body',
                    parameters: parameters.map(p => ({
                      type: 'text',
                      text: String(p.text || '')
                    }))
                  }
                ]
              : []
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: fallbackText }
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error?.message || `WhatsApp Cloud API error status: ${res.status}`;
      throw new Error(errorMsg);
    }

    const messageId = data.messages?.[0]?.id || `wa_${Date.now()}`;
    return {
      success: true,
      provider: NotificationProvider.WHATSAPP_CLOUD,
      messageId
    };
  }

  _resolveProviderName() {
    switch (this.providerType) {
      case 'whatsapp_cloud':
        return NotificationProvider.WHATSAPP_CLOUD;
      default:
        return NotificationProvider.MOCK_WHATSAPP;
    }
  }
}

export const whatsAppProvider = new WhatsAppProviderAdapter();
export default whatsAppProvider;

