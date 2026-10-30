import ShowPricingService from './show-pricing.service.js';
import ApiResponse from '../../../common/responses/api-response.js';

export class ShowPricingController {
  /**
   * Set or replace all pricing tiers for a show
   */
  static async setShowPricing(req, res, next) {
    try {
      const result = await ShowPricingService.setShowPricing(
        req.params.showId,
        req.body.pricingTiers,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Show pricing configured successfully',
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get pricing tiers for a show
   */
  static async getShowPricing(req, res, next) {
    try {
      const tiers = await ShowPricingService.getShowPricing(req.params.showId, req.user);
      return ApiResponse.success(res, {
        message: 'Show pricing retrieved successfully',
        data: tiers
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update pricing for a specific seat category
   */
  static async updateCategoryPrice(req, res, next) {
    try {
      const updated = await ShowPricingService.updateCategoryPrice(
        req.params.showId,
        req.params.categoryCode,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Category pricing updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default ShowPricingController;
