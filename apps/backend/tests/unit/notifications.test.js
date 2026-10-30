import EmailProvider from '../../src/services/notification/email.provider.js';
import SmsProvider from '../../src/services/notification/sms.provider.js';

describe('Notification Providers Unit Tests', () => {
  describe('EmailProvider', () => {
    it('should send generic email in test mode', async () => {
      const res = await EmailProvider.sendEmail({
        to: 'test@example.com',
        subject: 'Hello',
        text: 'Test content'
      });
      expect(res.success).toBe(true);
      expect(res.messageId).toBe('test-email-id');
    });

    it('should send OTP email template', async () => {
      const res = await EmailProvider.sendOtpEmail({
        to: 'test@example.com',
        otp: '123456',
        purpose: 'REGISTRATION'
      });
      expect(res.success).toBe(true);
    });

    it('should send password reset email template', async () => {
      const res = await EmailProvider.sendPasswordResetEmail({
        to: 'test@example.com',
        resetToken: 'mock-reset-token-abc'
      });
      expect(res.success).toBe(true);
    });
  });

  describe('SmsProvider', () => {
    it('should send SMS in test mode', async () => {
      const res = await SmsProvider.sendSms({
        to: '+919876543210',
        message: 'Your verification code is 123456'
      });
      expect(res.success).toBe(true);
      expect(res.messageId).toBe('test-sms-id');
    });

    it('should format and send OTP SMS', async () => {
      const res = await SmsProvider.sendOtpSms({
        to: '+919876543210',
        otp: '654321',
        purpose: 'LOGIN'
      });
      expect(res.success).toBe(true);
    });
  });
});

