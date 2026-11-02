import ShowPricing from './show-pricing.model.js';

export class ShowPricingRepository {
  /**
   * Upsert a pricing tier record for a show and category
   */
  static async upsertTier(tierData, session = null) {
    const options = { upsert: true, new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    return ShowPricing.findOneAndUpdate(
      { showId: tierData.showId, categoryCode: tierData.categoryCode },
      { $set: tierData },
      options
    ).exec();
  }

  /**
   * Find all pricing tiers for a show
   */
  static async findByShowId(showId) {
    return ShowPricing.find({ showId }).sort({ effectivePrice: -1 }).exec();
  }

  /**
   * Find pricing for a single category of a show
   */
  static async findByShowAndCategory(showId, categoryCode) {
    return ShowPricing.findOne({
      showId,
      categoryCode: String(categoryCode).toUpperCase()
    }).exec();
  }

  /**
   * Delete all pricing tiers for a show
   */
  static async deleteByShowId(showId, session = null) {
    const options = session ? { session } : {};
    return ShowPricing.deleteMany({ showId }, options).exec();
  }
}

export default ShowPricingRepository;
