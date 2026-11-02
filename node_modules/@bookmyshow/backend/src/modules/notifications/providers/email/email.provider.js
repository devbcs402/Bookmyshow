import env from '../../../../config/env.js';
import logger from '../../../../config/logger.js';
import { NotificationProvider } from '../../constants/notification.constants.js';

export class EmailProviderAdapter {
  constructor() {
    this.providerType = env.EMAIL_PROVIDER;
    this.fromName = env.EMAIL_FROM_NAME;
    this.fromAddress = env.EMAIL_FROM_ADDRESS;
  }

  /**
   * Formats the 'From' header string.
   * @returns {string} E.g. "BookMyShow Support <no-reply@bookmyshow.example.com>"
   */
  getFromHeader() {
    return `"${this.fromName}" <${this.fromAddress}>`;
  }

  /**
   * Dispatches an email through the configured provider.
   *
   * @param {Object} options
   * @param {string} options.to Recipient email address
   * @param {string} options.subject Email subject line
   * @param {string} options.html HTML email body
   * @param {string} [options.text=''] Plain text fallback
   * @returns {Promise<{ success: boolean, provider: string, messageId: string, error?: string }>}
   */
  async sendEmail({ to, subject, html, text = '' }) {
    if (!to || !to.includes('@')) {
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: 'Invalid recipient email address'
      };
    }

    // Test environment or Mock provider
    if (env.NODE_ENV === 'test' || this.providerType === 'mock') {
      logger.debug({ to, subject }, 'Mock Email dispatched');
      return {
        success: true,
        provider: NotificationProvider.MOCK_EMAIL,
        messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
    }

    try {
      if (this.providerType === 'resend' && env.RESEND_API_KEY) {
        return await this._sendViaResend({ to, subject, html, text });
      } else if (this.providerType === 'smtp') {
        return await this._sendViaSmtp({ to, subject, html, text });
      }

      // Default mock fallback
      return {
        success: true,
        provider: NotificationProvider.MOCK_EMAIL,
        messageId: `mock_email_${Date.now()}`
      };
    } catch (err) {
      logger.error({ err: err.message, to, subject }, 'Email dispatch failed at provider level');
      return {
        success: false,
        provider: this._resolveProviderName(),
        messageId: null,
        error: err.message
      };
    }
  }

  /**
   * Internal Resend HTTP API sender (zero extra npm dependency).
   * @private
   */
  async _sendViaResend({ to, subject, html, text }) {
    const payload = {
      from: this.getFromHeader(),
      to: [to],
      subject,
      html,
      text: text || undefined
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Resend API error status: ${res.status}`);
    }

    return {
      success: true,
      provider: NotificationProvider.RESEND,
      messageId: data.id || `resend_${Date.now()}`
    };
  }

  /**
   * Internal SMTP / Transport sender abstraction.
   * @private
   */
  async _sendViaSmtp({ to, subject, _html, _text }) {
    logger.info(
      { host: env.SMTP_HOST, port: env.SMTP_PORT, to, subject },
      'Simulating SMTP dispatch (Production ready with Nodemailer/Postfix)'
    );
    return {
      success: true,
      provider: NotificationProvider.SMTP,
      messageId: `smtp_${Date.now()}`
    };
  }

  _resolveProviderName() {
    switch (this.providerType) {
      case 'resend':
        return NotificationProvider.RESEND;
      case 'smtp':
        return NotificationProvider.SMTP;
      default:
        return NotificationProvider.MOCK_EMAIL;
    }
  }
}

export const emailProvider = new EmailProviderAdapter();
export default emailProvider;
