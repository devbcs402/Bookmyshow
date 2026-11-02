import ShowPricingRepository from './show-pricing.repository.js';
import ShowRepository from '../show.repository.js';
import SeatingLayoutRepository from '../../screens/seating-layout/seating-layout.repository.js';
import { calculateEffectivePrice } from '../show.utils.js';
import { NotFoundError } from '../../../common/errors/not-found.error.js';
import { ValidationError } from '../../../common/errors/validation.error.js';
import { Roles } from '../../auth/auth.constants.js';
import ErrorCodes from '../../../common/constants/error-codes.js';

export class ShowPricingService {
  /**
   * Helper: verify show existence and partner access
   */
  static async verifyShowAccess(showId, userContext) {
    const show = await ShowRepository.findById(showId);
    if (!show) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    const showPartnerId = show.partnerId?._id || show.partnerId;
    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(showPartnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    return show;
  }

  /**
   * Set or replace all pricing tiers for a show
   */
  static async setShowPricing(showId, pricingTiers, userContext, session = null) {
    const show = await this.verifyShowAccess(showId, userContext);
    const partnerId = show.partnerId?._id || show.partnerId;

    if (!Array.isArray(pricingTiers) || pricingTiers.length === 0) {
      throw new ValidationError(
        'At least one pricing tier is required',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Retrieve the screen's layout to validate category codes
    const layout = await SeatingLayoutRepository.findById(show.layoutId);
    if (!layout) {
      throw new NotFoundError('Associated seating layout not found', ErrorCodes.LAYOUT_NOT_FOUND);
    }

    const validCategories = new Set(
      layout.categoryBreakdown.map(c => String(c.categoryCode).toUpperCase())
    );

    const formattedTiers = [];

    for (const tier of pricingTiers) {
      const code = String(tier.categoryCode).toUpperCase().trim();

      if (validCategories.size > 0 && !validCategories.has(code)) {
        throw new ValidationError(
          `Category code "${tier.categoryCode}" does not exist in the screen layout`,
          ErrorCodes.INVALID_PRICING
        );
      }

      if (typeof tier.basePrice !== 'number' || tier.basePrice < 0) {
        throw new ValidationError('Base price cannot be negative', ErrorCodes.INVALID_PRICING);
      }

      const convenienceFee = tier.convenienceFee || 0;
      const taxPercent = typeof tier.taxPercent === 'number' ? tier.taxPercent : 18.0;
      const effectivePrice = calculateEffectivePrice(tier.basePrice, convenienceFee, taxPercent);

      const tierPayload = {
        showId: show._id,
        screenId: show.screenId?._id || show.screenId,
        partnerId,
        categoryCode: code,
        categoryName: tier.categoryName || code,
        basePrice: tier.basePrice,
        convenienceFee,
        taxPercent,
        effectivePrice,
        currency: tier.currency || 'INR',
        createdBy: userContext.id,
        updatedBy: userContext.id
      };

      await ShowPricingRepository.upsertTier(tierPayload, session);
      formattedTiers.push({
        categoryCode: code,
        categoryName: tier.categoryName || code,
        basePrice: tier.basePrice,
        convenienceFee,
        taxPercent,
        effectivePrice
      });
    }

    // Synchronize embedded pricingTiers inside the show document
    const updatedShow = await ShowRepository.updateById(
      show._id,
      {
        pricingTiers: formattedTiers,
        updatedBy: userContext.id
      },
      session
    );

    return {
      showId: show._id,
      pricingTiers: updatedShow.pricingTiers
    };
  }

  /**
   * Retrieve pricing tiers for a show
   */
  static async getShowPricing(showId, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);
    return ShowPricingRepository.findByShowId(show._id);
  }

  /**
   * Update price for a specific category
   */
  static async updateCategoryPrice(showId, categoryCode, updateData, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);
    const partnerId = show.partnerId?._id || show.partnerId;
    const code = String(categoryCode).toUpperCase().trim();

    const existingTier = await ShowPricingRepository.findByShowAndCategory(showId, code);
    if (!existingTier) {
      throw new NotFoundError(
        `Pricing for category "${categoryCode}" not found on this show`,
        ErrorCodes.NOT_FOUND
      );
    }

    const basePrice =
      updateData.basePrice !== undefined ? updateData.basePrice : existingTier.basePrice;
    const convenienceFee =
      updateData.convenienceFee !== undefined
        ? updateData.convenienceFee
        : existingTier.convenienceFee;
    const taxPercent =
      updateData.taxPercent !== undefined ? updateData.taxPercent : existingTier.taxPercent;

    if (basePrice < 0 || convenienceFee < 0 || taxPercent < 0) {
      throw new ValidationError(
        'Price and fee components cannot be negative',
        ErrorCodes.INVALID_PRICING
      );
    }

    const effectivePrice = calculateEffectivePrice(basePrice, convenienceFee, taxPercent);

    const updated = await ShowPricingRepository.upsertTier({
      showId: show._id,
      screenId: show.screenId?._id || show.screenId,
      partnerId,
      categoryCode: code,
      categoryName: updateData.categoryName || existingTier.categoryName,
      basePrice,
      convenienceFee,
      taxPercent,
      effectivePrice,
      updatedBy: userContext.id
    });

    // Sync into embedded show.pricingTiers
    const currentTiers = show.pricingTiers || [];
    const updatedEmbeddedTiers = currentTiers.map(t => {
      if (t.categoryCode === code) {
        return {
          ...t.toObject(),
          basePrice,
          convenienceFee,
          taxPercent,
          effectivePrice
        };
      }
      return t;
    });

    await ShowRepository.updateById(show._id, {
      pricingTiers: updatedEmbeddedTiers,
      updatedBy: userContext.id
    });

    return updated;
  }
}

export default ShowPricingService;
