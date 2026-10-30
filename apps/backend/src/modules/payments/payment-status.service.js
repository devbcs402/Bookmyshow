import { PaymentStatus, RefundStatus } from './payment.constants.js';
import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class PaymentStatusService {
  /**
   * Deterministic State Transition Map for Payment Transactions.
   */
  static PAYMENT_TRANSITIONS = Object.freeze({
    [PaymentStatus.CREATED]: Object.freeze([
      PaymentStatus.PENDING,
      PaymentStatus.AUTHORIZED,
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED
    ]),
    [PaymentStatus.PENDING]: Object.freeze([
      PaymentStatus.AUTHORIZED,
      PaymentStatus.CAPTURED,
      PaymentStatus.FAILED
    ]),
    [PaymentStatus.AUTHORIZED]: Object.freeze([PaymentStatus.CAPTURED, PaymentStatus.FAILED]),
    [PaymentStatus.CAPTURED]: Object.freeze([
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED
    ]),
    [PaymentStatus.REFUND_PENDING]: Object.freeze([
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.REFUNDED,
      PaymentStatus.CAPTURED // In case refund fails at gateway, return to CAPTURED
    ]),
    [PaymentStatus.PARTIALLY_REFUNDED]: Object.freeze([
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.REFUNDED
    ]),
    [PaymentStatus.FAILED]: Object.freeze([]),
    [PaymentStatus.REFUNDED]: Object.freeze([])
  });

  /**
   * Deterministic State Transition Map for Refund Entities.
   */
  static REFUND_TRANSITIONS = Object.freeze({
    [RefundStatus.PENDING]: Object.freeze([
      RefundStatus.PROCESSING,
      RefundStatus.SUCCESS,
      RefundStatus.FAILED
    ]),
    [RefundStatus.PROCESSING]: Object.freeze([RefundStatus.SUCCESS, RefundStatus.FAILED]),
    [RefundStatus.SUCCESS]: Object.freeze([]),
    [RefundStatus.FAILED]: Object.freeze([])
  });

  /**
   * Checks if payment transition is syntactically allowed.
   * @param {string} from
   * @param {string} to
   * @returns {boolean}
   */
  static isPaymentTransitionAllowed(from, to) {
    if (!from || !to || from === to) {
      return false;
    }
    const allowed = this.PAYMENT_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Validates a payment status transition and throws AppError if invalid.
   * @param {string} from
   * @param {string} to
   */
  static validatePaymentTransition(from, to) {
    if (!this.isPaymentTransitionAllowed(from, to)) {
      throw new AppError(
        `Invalid payment transition from '${from}' to '${to}'`,
        HttpStatus.CONFLICT,
        ErrorCodes.INVALID_PAYMENT_STATUS
      );
    }
  }

  /**
   * Checks if refund transition is syntactically allowed.
   * @param {string} from
   * @param {string} to
   * @returns {boolean}
   */
  static isRefundTransitionAllowed(from, to) {
    if (!from || !to || from === to) {
      return false;
    }
    const allowed = this.REFUND_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Validates a refund status transition and throws AppError if invalid.
   * @param {string} from
   * @param {string} to
   */
  static validateRefundTransition(from, to) {
    if (!this.isRefundTransitionAllowed(from, to)) {
      throw new AppError(
        `Invalid refund transition from '${from}' to '${to}'`,
        HttpStatus.CONFLICT,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }
  }

  /**
   * Builds an immutable status audit history entry.
   * @param {string} status
   * @param {string|null} [actorId=null]
   * @param {string} [note='']
   * @returns {Object}
   */
  static createStatusHistoryEntry(status, actorId = null, note = '') {
    return {
      status,
      timestamp: new Date(),
      actorId: actorId || null,
      note: note || ''
    };
  }
}

export default PaymentStatusService;
