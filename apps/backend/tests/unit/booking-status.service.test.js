import BookingStatusService from '../../src/modules/bookings/booking-status.service.js';
import { BookingStatus } from '../../src/modules/bookings/booking.constants.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { AppError } from '../../src/common/errors/app.error.js';

describe('BookingStatusService Unit Tests', () => {
  describe('isTransitionAllowed', () => {
    it('should allow valid transitions from PENDING_PAYMENT', () => {
      expect(
        BookingStatusService.isTransitionAllowed(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.CONFIRMED
        )
      ).toBe(true);
      expect(
        BookingStatusService.isTransitionAllowed(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.EXPIRED
        )
      ).toBe(true);
      expect(
        BookingStatusService.isTransitionAllowed(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.CANCELLED
        )
      ).toBe(true);
      expect(
        BookingStatusService.isTransitionAllowed(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.FAILED
        )
      ).toBe(true);
    });

    it('should reject invalid transitions from PENDING_PAYMENT directly to REFUNDED', () => {
      expect(
        BookingStatusService.isTransitionAllowed(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.REFUNDED
        )
      ).toBe(false);
    });

    it('should disallow transitions from terminal states', () => {
      expect(
        BookingStatusService.isTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)
      ).toBe(false);
      expect(
        BookingStatusService.isTransitionAllowed(BookingStatus.EXPIRED, BookingStatus.CONFIRMED)
      ).toBe(false);
      expect(
        BookingStatusService.isTransitionAllowed(BookingStatus.REFUNDED, BookingStatus.CONFIRMED)
      ).toBe(false);
    });
  });

  describe('validateTransition Business Rules', () => {
    it('should reject transition to CONFIRMED if payment is not verified', () => {
      expect(() =>
        BookingStatusService.validateTransition(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.CONFIRMED,
          { role: Roles.CUSTOMER, isVerifiedPayment: false }
        )
      ).toThrow(AppError);
    });

    it('should allow transition to CONFIRMED when isVerifiedPayment is true', () => {
      expect(() =>
        BookingStatusService.validateTransition(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.CONFIRMED,
          { role: Roles.CUSTOMER, isVerifiedPayment: true }
        )
      ).not.toThrow();
    });

    it('should allow Super Admin or System to confirm without payment verification for manual box-office overrides', () => {
      expect(() =>
        BookingStatusService.validateTransition(
          BookingStatus.PENDING_PAYMENT,
          BookingStatus.CONFIRMED,
          { role: Roles.SUPER_ADMIN, isVerifiedPayment: false }
        )
      ).not.toThrow();
    });

    it('should reject cancellation of confirmed booking within cutoff window', () => {
      const showStartTimeInOneHour = new Date(Date.now() + 60 * 60 * 1000);

      expect(() =>
        BookingStatusService.validateTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, {
          role: Roles.CUSTOMER,
          showStartTime: showStartTimeInOneHour,
          cancellationCutoffHours: 2
        })
      ).toThrow(AppError);
    });

    it('should permit cancellation of confirmed booking well before cutoff window', () => {
      const showStartTimeInFiveHours = new Date(Date.now() + 5 * 60 * 60 * 1000);

      expect(() =>
        BookingStatusService.validateTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED, {
          role: Roles.CUSTOMER,
          showStartTime: showStartTimeInFiveHours,
          cancellationCutoffHours: 2
        })
      ).not.toThrow();
    });
  });

  describe('createStatusHistoryEntry', () => {
    it('should generate structured status history object', () => {
      const entry = BookingStatusService.createStatusHistoryEntry(
        BookingStatus.CONFIRMED,
        '65f1a2b3c4d5e6f7a8b9c001',
        'Payment captured via Razorpay'
      );

      expect(entry.status).toBe(BookingStatus.CONFIRMED);
      expect(entry.actorId).toBe('65f1a2b3c4d5e6f7a8b9c001');
      expect(entry.notes).toBe('Payment captured via Razorpay');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });
});
