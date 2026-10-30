import Screen from './screen.model.js';

export class ScreenRepository {
  /**
   * Create a new screen document
   */
  static async create(screenData, session = null) {
    const options = session ? { session } : {};
    const [screen] = await Screen.create([screenData], options);
    return screen;
  }

  /**
   * Find screen by ID
   */
  static async findById(screenId) {
    return Screen.findOne({ _id: screenId, isDeleted: false })
      .populate('theatreId', 'name slug partnerId status')
      .populate('partnerId', 'businessName')
      .exec();
  }

  /**
   * Find screen by ID strictly scoped to partner tenant
   */
  static async findByIdAndPartnerId(screenId, partnerId) {
    return Screen.findOne({
      _id: screenId,
      partnerId,
      isDeleted: false
    })
      .populate('theatreId', 'name slug partnerId status')
      .exec();
  }

  /**
   * Find screen by theatre and screen number
   */
  static async findByTheatreAndNumber(theatreId, screenNumber) {
    return Screen.findOne({
      theatreId,
      screenNumber,
      isDeleted: false
    }).exec();
  }

  /**
   * List screens matching filter with pagination
   */
  static async findScreens(filter = {}, options = {}) {
    const { page = 1, limit = 20, sortBy = 'screenNumber', sortOrder = 'asc' } = options;
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const queryFilter = { ...filter, isDeleted: false };

    const [items, total] = await Promise.all([
      Screen.find(queryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('theatreId', 'name slug')
        .exec(),
      Screen.countDocuments(queryFilter).exec()
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update screen by ID
   */
  static async updateById(screenId, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    return Screen.findOneAndUpdate({ _id: screenId, isDeleted: false }, updateData, options).exec();
  }

  /**
   * Soft delete screen by ID
   */
  static async softDelete(screenId, userId, session = null) {
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    return Screen.findOneAndUpdate(
      { _id: screenId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          updatedBy: userId
        }
      },
      options
    ).exec();
  }

  /**
   * Count screens matching filter
   */
  static async count(filter = {}) {
    return Screen.countDocuments({ ...filter, isDeleted: false }).exec();
  }
}

export default ScreenRepository;

