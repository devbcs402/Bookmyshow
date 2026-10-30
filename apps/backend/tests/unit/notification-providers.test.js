import emailProvider from '../../src/modules/notifications/providers/email/email.provider.js';
import smsProvider, {
  SmsProviderAdapter
} from '../../src/modules/notifications/providers/sms/sms.provider.js';
import whatsAppProvider, {
  WhatsAppProviderAdapter
} from '../../src/modules/notifications/providers/whatsapp/whatsapp.provider.js';
import { NotificationProvider } from '../../src/modules/notifications/constants/notification.constants.js';

describe('Notification Provider Adapters Unit Tests', () => {
  describe('EmailProviderAdapter', () => {
    it('should format sender From header correctly', () => {
      const fromHeader = emailProvider.getFromHeader();
      expect(fromHeader).toContain('BookMyShow Support');
      expect(fromHeader).toContain('<no-reply@bookmyshow.example.com>');
    });

    it('should successfully dispatch mock email in test environment', async () => {
      const res = await emailProvider.sendEmail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test'
      });
      expect(res.success).toBe(true);
      expect(res.provider).toBe(NotificationProvider.MOCK_EMAIL);
      expect(res.messageId).toBeDefined();
    });

    it('should reject invalid recipient email addresses', async () => {
      const res = await emailProvider.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid recipient');
    });
  });

  describe('SmsProviderAdapter', () => {
    it('should validate Indian mobile numbers (+91XXXXXXXXXX)', () => {
      expect(SmsProviderAdapter.isValidPhone('+919876543210')).toBe(true);
      expect(SmsProviderAdapter.isValidPhone('+916123456789')).toBe(true);
      expect(SmsProviderAdapter.isValidPhone('9876543210')).toBe(false);
      expect(SmsProviderAdapter.isValidPhone('+12345678901')).toBe(false);
      expect(SmsProviderAdapter.isValidPhone('')).toBe(false);
      expect(SmsProviderAdapter.isValidPhone(null)).toBe(false);
    });

    it('should mask phone numbers for secure privacy logs', () => {
      expect(SmsProviderAdapter.maskPhone('+919876543210')).toBe('+9198****3210');
      expect(SmsProviderAdapter.maskPhone(null)).toBe('UNKNOWN');
    });

    it('should calculate GSM SMS parts accurately based on 160-char ceiling', () => {
      const shortMsg = 'Your OTP is 123456';
      expect(SmsProviderAdapter.calculateSmsParts(shortMsg)).toEqual({ length: 18, parts: 1 });

      const longMsg = 'A'.repeat(200);
      expect(SmsProviderAdapter.calculateSmsParts(longMsg)).toEqual({ length: 200, parts: 2 });
    });

    it('should successfully dispatch mock SMS in test environment', async () => {
      const res = await smsProvider.sendSms({
        to: '+919876543210',
        message: 'Your movie ticket is confirmed.'
      });
      expect(res.success).toBe(true);
      expect(res.provider).toBe(NotificationProvider.MOCK_SMS);
      expect(res.messageId).toBeDefined();
    });

    it('should reject invalid phone numbers and empty content', async () => {
      const invalidPhoneRes = await smsProvider.sendSms({
        to: '9876543210',
        message: 'Hello'
      });
      expect(invalidPhoneRes.success).toBe(false);
      expect(invalidPhoneRes.error).toContain('Invalid Indian mobile number');

      const emptyMsgRes = await smsProvider.sendSms({
        to: '+919876543210',
        message: '   '
      });
      expect(emptyMsgRes.success).toBe(false);
      expect(emptyMsgRes.error).toContain('cannot be empty');
    });
  });

  describe('WhatsAppProviderAdapter', () => {
    it('should format recipient phone number for WhatsApp Business API', () => {
      expect(WhatsAppProviderAdapter.formatWhatsAppRecipient('+91-98765-43210')).toBe(
        '919876543210'
      );
      expect(WhatsAppProviderAdapter.formatWhatsAppRecipient('')).toBe('');
    });

    it('should reject WhatsApp dispatch if user has not granted explicit opt-in consent', async () => {
      const res = await whatsAppProvider.sendMessage({
        to: '+919876543210',
        templateName: 'bms_booking_confirmed',
        hasConsent: false
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('opted-in');
    });

    it('should successfully dispatch mock WhatsApp message when consent is granted', async () => {
      const res = await whatsAppProvider.sendMessage({
        to: '+919876543210',
        templateName: 'bms_booking_confirmed',
        parameters: [{ type: 'text', text: 'BK-12345' }],
        hasConsent: true
      });
      expect(res.success).toBe(true);
      expect(res.provider).toBe(NotificationProvider.MOCK_WHATSAPP);
      expect(res.messageId).toBeDefined();
    });
  });
});
