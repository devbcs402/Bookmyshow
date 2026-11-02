import PaymentStatusService from '../../src/modules/payments/payment-status.service.js';
import { PaymentStatus, RefundStatus } from '../../src/modules/payments/payment.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('PaymentStatusService Unit Tests', () => {
  describe('Payment Transitions', () => {
    it('should permit valid transitions from CREATED', () => {
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.CREATED,
          PaymentStatus.PENDING
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(PaymentStatus.CREATED, PaymentStatus.FAILED)
      ).toBe(true);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.CREATED,
          PaymentStatus.AUTHORIZED
        )
      ).toBe(true);
    });

    it('should permit valid transitions from PENDING to CAPTURED or FAILED', () => {
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.PENDING,
          PaymentStatus.CAPTURED
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(PaymentStatus.PENDING, PaymentStatus.FAILED)
      ).toBe(true);
    });

    it('should permit transition from CAPTURED to refund states', () => {
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.CAPTURED,
          PaymentStatus.REFUND_PENDING
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.CAPTURED,
          PaymentStatus.REFUNDED
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.CAPTURED,
          PaymentStatus.PARTIALLY_REFUNDED
        )
      ).toBe(true);
    });

    it('should disallow illegal transitions from terminal states', () => {
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.FAILED,
          PaymentStatus.CAPTURED
        )
      ).toBe(false);
      expect(
        PaymentStatusService.isPaymentTransitionAllowed(
          PaymentStatus.REFUNDED,
          PaymentStatus.CAPTURED
        )
      ).toBe(false);
    });

    it('should throw AppError on invalid payment transition validation', () => {
      expect(() => {
        PaymentStatusService.validatePaymentTransition(
          PaymentStatus.CREATED,
          PaymentStatus.REFUNDED
        );
      }).toThrow(AppError);
    });
  });

  describe('Refund Transitions', () => {
    it('should permit valid refund transitions', () => {
      expect(
        PaymentStatusService.isRefundTransitionAllowed(
          RefundStatus.PENDING,
          RefundStatus.PROCESSING
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isRefundTransitionAllowed(
          RefundStatus.PROCESSING,
          RefundStatus.SUCCESS
        )
      ).toBe(true);
      expect(
        PaymentStatusService.isRefundTransitionAllowed(RefundStatus.PROCESSING, RefundStatus.FAILED)
      ).toBe(true);
    });

    it('should reject transitions from terminal refund states', () => {
      expect(
        PaymentStatusService.isRefundTransitionAllowed(RefundStatus.SUCCESS, RefundStatus.PENDING)
      ).toBe(false);
      expect(
        PaymentStatusService.isRefundTransitionAllowed(RefundStatus.FAILED, RefundStatus.SUCCESS)
      ).toBe(false);
    });

    it('should throw AppError on invalid refund transition validation', () => {
      expect(() => {
        PaymentStatusService.validateRefundTransition(RefundStatus.SUCCESS, RefundStatus.FAILED);
      }).toThrow(AppError);
    });
  });

  describe('createStatusHistoryEntry', () => {
    it('should build a structured status history audit entry', () => {
      const entry = PaymentStatusService.createStatusHistoryEntry(
        PaymentStatus.CAPTURED,
        'user-123',
        'Captured via checkout verification'
      );
      expect(entry.status).toBe(PaymentStatus.CAPTURED);
      expect(entry.actorId).toBe('user-123');
      expect(entry.note).toBe('Captured via checkout verification');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });
});
