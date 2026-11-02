import config from '../../config/env.js';
import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class BookingPricingService {
  /**
   * Rounds a number to exactly 2 decimal places to avoid IEEE 754 floating point issues.
   * @param {number} val
   * @returns {number}
   */
  static roundCurrency(val) {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculates total pricing snapshot for a set of seats against show pricing tiers.
   *
   * @param {Array<Object>} seats Physical seat documents (with categoryCode, seatLabel, rowLabel, columnNumber)
   * @param {Array<Object>} pricingTiers Show pricing tiers from Show or ShowPricing
   * @param {Object} [options]
   * @param {number} [options.discountAmount=0]
   * @returns {Object} Comprehensive pricing breakdown and seat line-item snapshots
   */
  static calculateBookingPrice(seats, pricingTiers, options = {}) {
    if (!Array.isArray(seats) || seats.length === 0) {
      throw new AppError(
        'At least one seat must be selected for price calculation',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!Array.isArray(pricingTiers) || pricingTiers.length === 0) {
      throw new AppError(
        'Show pricing tiers are missing or incomplete',
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.PRICING_INCOMPLETE
      );
    }

    // Build quick lookup map by uppercase categoryCode
    const tierMap = new Map();
    for (const tier of pricingTiers) {
      if (tier && tier.categoryCode) {
        tierMap.set(tier.categoryCode.toUpperCase(), tier);
      }
    }

    let totalBaseAmount = 0;
    let totalConvenienceFee = 0;
    let totalTaxAmount = 0;
    const seatLineItems = [];

    for (const seat of seats) {
      const code = (seat.categoryCode || '').toUpperCase();
      const tier = tierMap.get(code);

      if (!tier) {
        throw new AppError(
          `No pricing tier configured for seat category '${code}' in this show`,
          HttpStatus.BAD_REQUEST,
          ErrorCodes.PRICING_INCOMPLETE
        );
      }

      const basePrice = this.roundCurrency(tier.basePrice);
      const convenienceFee = this.roundCurrency(
        tier.convenienceFee !== undefined ? tier.convenienceFee : config.DEFAULT_CONVENIENCE_FEE
      );
      const taxPercent =
        tier.taxPercent !== undefined ? tier.taxPercent : config.DEFAULT_TAX_PERCENT;

      // GST is applied on convenience fee and/or base price according to regulations (standard BMS applies 18% on convenience fee)
      // If tier provides effectivePrice, honor tier tax specification, otherwise compute standard tax on convenience fee
      const seatTax = this.roundCurrency((convenienceFee * taxPercent) / 100);
      const unitTotal = this.roundCurrency(basePrice + convenienceFee + seatTax);

      totalBaseAmount = this.roundCurrency(totalBaseAmount + basePrice);
      totalConvenienceFee = this.roundCurrency(totalConvenienceFee + convenienceFee);
      totalTaxAmount = this.roundCurrency(totalTaxAmount + seatTax);

      seatLineItems.push({
        seatId: seat._id || seat.seatId,
        seatLabel: seat.seatLabel,
        rowLabel: seat.rowLabel || '',
        columnNumber: seat.columnNumber || 0,
        categoryCode: code,
        categoryName: tier.categoryName || code,
        unitPrice: unitTotal,
        priceSnapshot: {
          basePrice,
          convenienceFee,
          taxAmount: seatTax
        },
        status: 'RESERVED'
      });
    }

    const discountAmount = this.roundCurrency(options.discountAmount || 0);
    const subtotal = this.roundCurrency(totalBaseAmount + totalConvenienceFee + totalTaxAmount);
    const netPayableAmount = Math.max(0, this.roundCurrency(subtotal - discountAmount));

    return {
      baseAmount: totalBaseAmount,
      convenienceFee: totalConvenienceFee,
      taxAmount: totalTaxAmount,
      discountAmount,
      netPayableAmount,
      currency: 'INR',
      seatLineItems
    };
  }
}

export default BookingPricingService;
