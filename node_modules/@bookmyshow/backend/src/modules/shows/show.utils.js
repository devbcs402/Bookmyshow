import { AllowedStatusTransitions, DefaultCleanupBufferMinutes } from './show.constants.js';

/**
 * Calculates show endTime and occupiedEndTime (including buffer duration).
 *
 * @param {Date|string} startTime
 * @param {number} durationMins
 * @param {number} [cleanupBufferMinutes=DefaultCleanupBufferMinutes]
 * @returns {{ endTime: Date, occupiedEndTime: Date }}
 */
export const calculateOccupiedEndTime = (
  startTime,
  durationMins,
  cleanupBufferMinutes = DefaultCleanupBufferMinutes
) => {
  const start = new Date(startTime);
  const durationMs = Number(durationMins) * 60 * 1000;
  const bufferMs = Number(cleanupBufferMinutes) * 60 * 1000;

  const endTime = new Date(start.getTime() + durationMs);
  const occupiedEndTime = new Date(endTime.getTime() + bufferMs);

  return { endTime, occupiedEndTime };
};

/**
 * Normalizes a calendar date to UTC midnight (00:00:00.000Z).
 *
 * @param {Date|string} dateInput
 * @returns {Date}
 */
export const normalizeShowDate = dateInput => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Evaluates whether a show status transition is valid according to the operational state machine.
 *
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {boolean}
 */
export const isAllowedShowStatusTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) {
    return true;
  }
  const allowed = AllowedStatusTransitions[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
};

/**
 * Calculates effective ticket price factoring in base price, optional convenience fee, and GST.
 *
 * @param {number} basePrice
 * @param {number} [convenienceFee=0]
 * @param {number} [taxPercent=18.0]
 * @returns {number}
 */
export const calculateEffectivePrice = (basePrice, convenienceFee = 0, taxPercent = 18.0) => {
  const subtotal = Number(basePrice) + Number(convenienceFee);
  const tax = (subtotal * Number(taxPercent)) / 100;
  return Math.round((subtotal + tax) * 100) / 100;
};

export default {
  calculateOccupiedEndTime,
  normalizeShowDate,
  isAllowedShowStatusTransition,
  calculateEffectivePrice
};
