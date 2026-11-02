import config from '../../config/env.js';
import logger from '../../config/logger.js';

export class SmsProvider {
  /**
   * Dispatch an SMS message (mock in development/test, extensible for Twilio / Fast2SMS)
   */
  static async sendSms({ to, message }) {
    if (config.NODE_ENV === 'test') {
      return { success: true, messageId: 'test-sms-id' };
    }

    logger.info({
      msg: 'Dispatching SMS',
      recipient: to.replace(/(\+\d{2}\d{2})\d{4}(\d{4})/, '$1****$2') // Mask middle digits for privacy
    });

    if (config.NODE_ENV === 'development') {
      logger.debug({
        msg: 'Development SMS Dispatch Event',
        recipient: to,
        bodyPreview: message ? message.substring(0, 50) : ''
      });
    }

    return { success: true, messageId: `sms_${Date.now()}` };
  }

  static async sendOtpSms({ to, otp, purpose }) {
    const message = `Your BookMyShow verification code for ${purpose} is ${otp}. Valid for 10 minutes. Do not share.`;
    return this.sendSms({ to, message });
  }
}

export default SmsProvider;
