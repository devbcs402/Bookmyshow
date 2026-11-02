import PaymentSignatureService from '../../src/modules/payments/payment-signature.service.js';

describe('PaymentSignatureService Unit Tests', () => {
  const mockSecret = 'test_secret_key_1234567890_super_secret';
  const mockOrderId = 'order_DBJOWzybf0sJbb';
  const mockPaymentId = 'pay_29QQoUBi66xm2f';

  describe('Checkout Signature Verification', () => {
    it('should generate and verify a genuine checkout signature', () => {
      const signature = PaymentSignatureService.generateCheckoutSignature(
        mockOrderId,
        mockPaymentId,
        mockSecret
      );

      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);

      const isValid = PaymentSignatureService.verifyCheckoutSignature(
        mockOrderId,
        mockPaymentId,
        signature,
        mockSecret
      );
      expect(isValid).toBe(true);
    });

    it('should reject a forged checkout signature', () => {
      const forgedSignature = '0000000000000000000000000000000000000000000000000000000000000000';
      const isValid = PaymentSignatureService.verifyCheckoutSignature(
        mockOrderId,
        mockPaymentId,
        forgedSignature,
        mockSecret
      );
      expect(isValid).toBe(false);
    });

    it('should reject a signature verified against a mismatched order ID', () => {
      const signature = PaymentSignatureService.generateCheckoutSignature(
        mockOrderId,
        mockPaymentId,
        mockSecret
      );

      const isValid = PaymentSignatureService.verifyCheckoutSignature(
        'order_DIFFERENT_ORDER',
        mockPaymentId,
        signature,
        mockSecret
      );
      expect(isValid).toBe(false);
    });

    it('should return false if any parameter is missing or non-string', () => {
      expect(PaymentSignatureService.verifyCheckoutSignature('', mockPaymentId, 'sig')).toBe(false);
      expect(PaymentSignatureService.verifyCheckoutSignature(mockOrderId, '', 'sig')).toBe(false);
      expect(PaymentSignatureService.verifyCheckoutSignature(mockOrderId, mockPaymentId, '')).toBe(
        false
      );
    });
  });

  describe('Webhook Signature Verification', () => {
    const mockWebhookSecret = 'test_webhook_secret_key_987654321';
    const mockRawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: mockPaymentId, order_id: mockOrderId, amount: 50000 } }
      }
    });

    it('should generate and verify a genuine webhook signature against raw payload', () => {
      const signature = PaymentSignatureService.generateWebhookSignature(
        mockRawBody,
        mockWebhookSecret
      );

      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);

      const isValid = PaymentSignatureService.verifyWebhookSignature(
        mockRawBody,
        signature,
        mockWebhookSecret
      );
      expect(isValid).toBe(true);
    });

    it('should reject a webhook if payload was modified/tampered after signing', () => {
      const signature = PaymentSignatureService.generateWebhookSignature(
        mockRawBody,
        mockWebhookSecret
      );

      const tamperedBody = mockRawBody.replace('50000', '10000');
      const isValid = PaymentSignatureService.verifyWebhookSignature(
        tamperedBody,
        signature,
        mockWebhookSecret
      );
      expect(isValid).toBe(false);
    });

    it('should reject a webhook signature with incorrect secret', () => {
      const signature = PaymentSignatureService.generateWebhookSignature(
        mockRawBody,
        mockWebhookSecret
      );

      const isValid = PaymentSignatureService.verifyWebhookSignature(
        mockRawBody,
        signature,
        'wrong_secret'
      );
      expect(isValid).toBe(false);
    });

    it('should return false if rawBody or signature is missing', () => {
      expect(PaymentSignatureService.verifyWebhookSignature('', 'sig', mockWebhookSecret)).toBe(
        false
      );
      expect(
        PaymentSignatureService.verifyWebhookSignature(mockRawBody, '', mockWebhookSecret)
      ).toBe(false);
    });
  });
});
