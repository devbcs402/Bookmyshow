import env from '../../../../config/env.js';
import logger from '../../../../config/logger.js';
import { NotificationProvider } from '../../constants/notification.constants.js';

export class SmsProviderAdapter {
  constructor() {
    this.providerType = env.SMS_PROVIDER;
    this.senderId = env.SMS_SENDER_ID || 'BMSIND';
  }

  /**
   * Validates standard Indian mobile phone number format (+91XXXXXXXXXX).
   * @param {string} phone
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    return /^\+91[6-9]\d{9}$/.test(phone.trim());
  }

  /**
   * Masks recipient phone number for secure logging (GDPR / Indian DPDP Act compliance).
   * @param {string} phone
   * @returns {string} E.g. "+9198****1234"
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return 'UNKNOWN';
    }
    return phone.replace(/(\+\d{2}\d{2})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * Calculates SMS segment parts based on standard GSM 7-bit character limits (160 chars).
   * @param {string} text
   * @returns {{ length: number, parts: number }}
   */
  static calculateSmsParts(text) {
    const length = text ? text.length : 0;
    if (length <= 160) {
      return { length, parts: length === 0 ? 0 : 1 };
    }
    // Multi-part SMS messages reserve 7 bytes for UDH headers, using 153 chars per segment
    return { length, parts: Math.ceil(length / 153) };
  }

  /**
   * Dispatches an SMS alert via the configured telecom gateway.
   *
   * @param {Object} options
   * @param {string} options.to E.164 phone number
   * @param {string} options.message Text message content
   * @param {string} [options.dltTemplateId=null] Indian Telecom TRAI DLT approved template ID
   * @returns {Promise<{ success: boolean, provider: string, messageId: string, error?: string }>}
   */
  async sendSms({ to, message, dltTemplateId = null }) {
    if (!SmsProviderAdapter.isValidPhone(to)) {
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: `Invalid Indian mobile number format: ${SmsProviderAdapter.maskPhone(to)}. Expected +91XXXXXXXXXX.`
      };
    }

    if (!message || message.trim().length === 0) {
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: 'SMS message content cannot be empty'
      };
    }

    const { length, parts } = SmsProviderAdapter.calculateSmsParts(message);

    // Test environment or Mock provider
    if (env.NODE_ENV === 'test' || this.providerType === 'mock') {
      logger.debug(
        { recipient: SmsProviderAdapter.maskPhone(to), length, parts },
        'Mock SMS dispatched successfully'
      );
      return {
        success: true,
        provider: NotificationProvider.MOCK_SMS,
        messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
    }

    try {
      if (this.providerType === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        return await this._sendViaTwilio({ to, message });
      } else if (this.providerType === 'fast2sms' && env.FAST2SMS_API_KEY) {
        return await this._sendViaFast2Sms({ to, message, dltTemplateId });
      }

      // Default mock fallback
      return {
        success: true,
        provider: NotificationProvider.MOCK_SMS,
        messageId: `mock_sms_${Date.now()}`
      };
    } catch (err) {
      logger.error(
        { err: err.message, recipient: SmsProviderAdapter.maskPhone(to) },
        'SMS dispatch failed at provider level'
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
   * Internal Twilio REST API integration.
   * @private
   */
  async _sendViaTwilio({ to, message }) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString(
      'base64'
    );

    const formData = new URLSearchParams();
    formData.append('To', to);
    formData.append('From', env.TWILIO_FROM_PHONE || this.senderId);
    formData.append('Body', message);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Twilio error status: ${res.status}`);
    }

    return {
      success: true,
      provider: NotificationProvider.TWILIO,
      messageId: data.sid || `tw_${Date.now()}`
    };
  }

  /**
   * Internal Fast2SMS API integration for Indian DLT routes.
   * @private
   */
  async _sendViaFast2Sms({ to, message, dltTemplateId }) {
    const rawNumber = to.replace(/^\+91/, '');
    const payload = {
      route: dltTemplateId ? 'dlt' : 'q',
      sender_id: this.senderId,
      message,
      language: 'english',
      flash: 0,
      numbers: rawNumber
    };

    if (dltTemplateId) {
      payload.template_id = dltTemplateId;
    }

    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || data.return === false) {
      throw new Error(data.message?.[0] || 'Fast2SMS dispatch rejected');
    }

    return {
      success: true,
      provider: NotificationProvider.FAST2SMS,
      messageId: data.request_id || `f2s_${Date.now()}`
    };
  }

  _resolveProviderName() {
    switch (this.providerType) {
      case 'twilio':
        return NotificationProvider.TWILIO;
      case 'fast2sms':
        return NotificationProvider.FAST2SMS;
      default:
        return NotificationProvider.MOCK_SMS;
    }
  }
}

export const smsProvider = new SmsProviderAdapter();
export default smsProvider;

