import config from '../../config/env.js';
import logger from '../../config/logger.js';

export class EmailProvider {
  /**
   * Send an email notification (mock in development/test, extensible for Nodemailer / SendGrid / AWS SES)
   */
  static async sendEmail({ to, subject, text, html = '' }) {
    if (config.NODE_ENV === 'test') {
      return {
        success: true,
        messageId: 'test-email-id',
        htmlSnippet: html ? html.substring(0, 20) : ''
      };
    }

    logger.info({
      msg: 'Dispatching Transactional Email',
      recipient: to,
      subject
    });

    if (config.NODE_ENV === 'development') {
      logger.debug({
        msg: 'Development Email Payload Preview',
        to,
        subject,
        previewText: text ? text.substring(0, 100) : ''
      });
    }

    return { success: true, messageId: `msg_${Date.now()}` };
  }

  static async sendOtpEmail({ to, otp, purpose }) {
    const subject = `Your BookMyShow Verification Code for ${purpose}`;
    const text = `Your one-time verification code is ${otp}. This code expires in 10 minutes. Never share this code with anyone.`;
    const html = `<p>Your one-time verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes. Never share this code with anyone.</p>`;

    return this.sendEmail({ to, subject, text, html });
  }

  static async sendPasswordResetEmail({ to, resetToken }) {
    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request for your BookMyShow Account';
    const text = `You requested a password reset. Please click the following link to reset your password: ${resetUrl}. This link expires in 15 minutes.`;
    const html = `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 15 minutes.</p>`;

    return this.sendEmail({ to, subject, text, html });
  }
}

export default EmailProvider;
