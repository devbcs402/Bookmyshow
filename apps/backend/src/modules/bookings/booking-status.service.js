import { BookingStatus } from './booking.constants.js';
import { Roles } from '../auth/auth.constants.js';
import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class BookingStatusService {
  /**
   * Deterministic State Transition Map
   * Dictates which target statuses are permissible from each originating status.
   */
  static TRANSITION_GRAPH = Object.freeze({
    [BookingStatus.PENDING_PAYMENT]: Object.freeze([
      BookingStatus.CONFIRMED,
      BookingStatus.FAILED,
      BookingStatus.EXPIRED,
      BookingStatus.CANCELLED
    ]),
    [BookingStatus.CONFIRMED]: Object.freeze([
      BookingStatus.CANCELLED,
      BookingStatus.REFUND_PENDING
    ]),
    [BookingStatus.REFUND_PENDING]: Object.freeze([
      BookingStatus.REFUNDED,
      BookingStatus.CONFIRMED
    ]),
    [BookingStatus.CANCELLED]: Object.freeze([]),
    [BookingStatus.EXPIRED]: Object.freeze([]),
    [BookingStatus.FAILED]: Object.freeze([]),
    [BookingStatus.REFUNDED]: Object.freeze([])
  });

  /**
   * Evaluates whether a transition is syntactically valid in the state graph.
   * @param {string} currentStatus
   * @param {string} targetStatus
   * @returns {boolean}
   */
  static isTransitionAllowed(currentStatus, targetStatus) {
    if (!currentStatus || !targetStatus) {
      return false;
    }
    if (currentStatus === targetStatus) {
      return false;
    }
    const allowed = this.TRANSITION_GRAPH[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Validates state transition eligibility against business rules, actor roles, and payment preconditions.
   *
   * @param {string} currentStatus
   * @param {string} targetStatus
   * @param {Object} context
   * @param {string} [context.role] Actor role (CUSTOMER, THEATRE_OWNER, SUPER_ADMIN, SYSTEM)
   * @param {boolean} [context.isVerifiedPayment=false] Flag indicating cryptographic payment verification from Part 11
   * @param {Date} [context.showStartTime] Start time of screening
   * @param {number} [context.cancellationCutoffHours=2]
   */
  static validateTransition(currentStatus, targetStatus, context = {}) {
    if (!this.isTransitionAllowed(currentStatus, targetStatus)) {
      throw new AppError(
        `Invalid booking status transition from '${currentStatus}' to '${targetStatus}'`,
        HttpStatus.CONFLICT,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const { role, isVerifiedPayment = false, showStartTime, cancellationCutoffHours = 2 } = context;

    // RULE 1: Transition to CONFIRMED requires verified payment or Super Admin manual box-office override
    if (targetStatus === BookingStatus.CONFIRMED) {
      if (!isVerifiedPayment && role !== Roles.SUPER_ADMIN && role !== 'SYSTEM') {
        throw new AppError(
          'A booking cannot be marked CONFIRMED without verified payment confirmation',
          HttpStatus.FORBIDDEN,
          ErrorCodes.AUTHORIZATION_ERROR
        );
      }
    }

    // RULE 2: Cancellation of CONFIRMED bookings must respect the show start cutoff window
    if (currentStatus === BookingStatus.CONFIRMED && targetStatus === BookingStatus.CANCELLED) {
      if (showStartTime) {
        const cutoffMs = cancellationCutoffHours * 60 * 60 * 1000;
        const cutoffTime = new Date(new Date(showStartTime).getTime() - cutoffMs);
        if (Date.now() >= cutoffTime.getTime() && role !== Roles.SUPER_ADMIN) {
          throw new AppError(
            `Confirmed bookings cannot be cancelled within ${cancellationCutoffHours} hours of show start time`,
            HttpStatus.BAD_REQUEST,
            ErrorCodes.BOOKING_NOT_CANCELLABLE
          );
        }
      }
    }
  }

  /**
   * Builds an immutable status audit history item.
   * @param {string} status
   * @param {string|null} [actorId]
   * @param {string} [notes='']
   * @returns {Object}
   */
  static createStatusHistoryEntry(status, actorId = null, notes = '') {
    return {
      status,
      timestamp: new Date(),
      actorId: actorId || null,
      notes: notes || `Transitioned to ${status}`
    };
  }
}

export default BookingStatusService;
