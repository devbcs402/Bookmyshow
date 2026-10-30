import SeatCategory from './seat-category.model.js';

export class SeatCategoryRepository {
  /**
   * Create a new seat category
   */
  static async create(categoryData) {
    return SeatCategory.create(categoryData);
  }

  /**
   * Find category by ID
   */
  static async findById(id) {
    return SeatCategory.findOne({ _id: id, deletedAt: null }).exec();
  }

  /**
   * Find category by code and partnerId (or global)
   */
  static async findByCode(code, partnerId = null) {
    const query = {
      code: String(code).toUpperCase(),
      deletedAt: null
    };

    if (partnerId) {
      query.$or = [{ partnerId }, { partnerId: null }];
    } else {
      query.partnerId = null;
    }

    return SeatCategory.findOne(query).sort({ partnerId: -1 }).exec();
  }

  /**
   * Find exact category for partner
   */
  static async findExactByPartnerAndCode(partnerId, code) {
    return SeatCategory.findOne({
      partnerId,
      code: String(code).toUpperCase(),
      deletedAt: null
    }).exec();
  }

  /**
   * Get all active categories available for a partner (tenant custom + platform default)
   */
  static async findAllForPartner(partnerId) {
    const filter = {
      deletedAt: null,
      isActive: true,
      $or: [{ partnerId: null }]
    };

    if (partnerId) {
      filter.$or.push({ partnerId });
    }

    // Sort so tenant overrides take precedence or sorted by sortOrder
    return SeatCategory.find(filter).sort({ sortOrder: 1, name: 1 }).exec();
  }

  /**
   * List all categories (for admin or management)
   */
  static async findAll(filter = {}) {
    return SeatCategory.find({ ...filter, deletedAt: null })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Update category by ID
   */
  static async updateById(id, updateData) {
    return SeatCategory.findOneAndUpdate({ _id: id, deletedAt: null }, updateData, {
      new: true,
      runValidators: true
    }).exec();
  }

  /**
   * Soft delete category
   */
  static async softDelete(id) {
    return SeatCategory.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    ).exec();
  }
}

export default SeatCategoryRepository;
