import Show from './show.model.js';

export class ShowRepository {
  /**
   * Create a new show document
   */
  static async create(showData, session = null) {
    const options = session ? { session } : {};
    const [show] = await Show.create([showData], options);
    return show;
  }

  /**
   * Find show by ID with standard populates
   */
  static async findById(showId, session = null) {
    const options = session ? { session } : {};
    return Show.findOne({ _id: showId, isDeleted: false }, null, options)
      .populate(
        'movieId',
        'title slug posterUrl durationMins censorRating languages availableFormats'
      )
      .populate('theatreId', 'name slug partnerId address location status')
      .populate(
        'screenId',
        'name screenNumber screenType supportedFormats layoutVersion soundSystem'
      )
      .populate('cityId', 'name slug state')
      .exec();
  }

  /**
   * Find show by ID strictly scoped to partner tenant
   */
  static async findByIdAndPartnerId(showId, partnerId, session = null) {
    const options = session ? { session } : {};
    return Show.findOne({ _id: showId, partnerId, isDeleted: false }, null, options)
      .populate(
        'movieId',
        'title slug posterUrl durationMins censorRating languages availableFormats'
      )
      .populate('theatreId', 'name slug partnerId address location status')
      .populate(
        'screenId',
        'name screenNumber screenType supportedFormats layoutVersion soundSystem'
      )
      .populate('cityId', 'name slug state')
      .exec();
  }

  /**
   * Query shows with filtering, sorting, and pagination
   */
  static async findShows(filter = {}, options = {}) {
    const { page = 1, limit = 20, sortBy = 'startTime', sortOrder = 'asc' } = options;
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const queryFilter = { ...filter, isDeleted: false };

    const [items, total] = await Promise.all([
      Show.find(queryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(
          'movieId',
          'title slug posterUrl durationMins censorRating languages availableFormats'
        )
        .populate('theatreId', 'name slug address')
        .populate('screenId', 'name screenNumber screenType')
        .populate('cityId', 'name slug')
        .exec(),
      Show.countDocuments(queryFilter).exec()
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
   * Update show document by ID
   */
  static async updateById(showId, updateData, session = null) {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    return Show.findOneAndUpdate({ _id: showId, isDeleted: false }, updateData, options).exec();
  }

  /**
   * Soft delete show
   */
  static async softDelete(showId, userId, session = null) {
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    return Show.findOneAndUpdate(
      { _id: showId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedBy: userId
        }
      },
      options
    ).exec();
  }

  /**
   * Count documents matching filter
   */
  static async count(filter = {}) {
    return Show.countDocuments({ ...filter, isDeleted: false }).exec();
  }
}

export default ShowRepository;
