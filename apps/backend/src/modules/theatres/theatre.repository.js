import Theatre from './model/theatre.model.js';
import City from './model/city.model.js';
import { PublicVisibleTheatreStatuses } from './theatre.constants.js';

export class TheatreRepository {
  /**
   * Create a new theatre document
   */
  static async create(theatreData) {
    return Theatre.create(theatreData);
  }

  /**
   * Find theatre by primary ID
   */
  static async findById(theatreId) {
    return Theatre.findOne({ _id: theatreId, isDeleted: false })
      .populate('address.cityId', 'name slug state isTopCity')
      .populate('partnerId', 'businessName kycStatus')
      .exec();
  }

  /**
   * Find theatre by primary ID scoped strictly to a specific partner tenant
   */
  static async findByIdAndPartnerId(theatreId, partnerId) {
    return Theatre.findOne({
      _id: theatreId,
      partnerId,
      isDeleted: false
    })
      .populate('address.cityId', 'name slug state isTopCity')
      .exec();
  }

  /**
   * Find theatre by slug
   */
  static async findBySlug(slug) {
    return Theatre.findOne({ slug, isDeleted: false })
      .populate('address.cityId', 'name slug state isTopCity')
      .populate('partnerId', 'businessName kycStatus')
      .exec();
  }

  /**
   * Find public theatre by slug (only approved and active)
   */
  static async findPublicBySlug(slug) {
    return Theatre.findOne({
      slug,
      status: { $in: PublicVisibleTheatreStatuses },
      isActive: true,
      isDeleted: false
    })
      .populate('address.cityId', 'name slug state isTopCity')
      .exec();
  }

  /**
   * Find public theatre by ID (only approved and active)
   */
  static async findPublicById(theatreId) {
    return Theatre.findOne({
      _id: theatreId,
      status: { $in: PublicVisibleTheatreStatuses },
      isActive: true,
      isDeleted: false
    })
      .populate('address.cityId', 'name slug state isTopCity')
      .exec();
  }

  /**
   * Query theatres for a specific partner owner with pagination and filters
   */
  static async findOwnerTheatres({
    partnerId,
    filter = {},
    skip = 0,
    limit = 20,
    sort = { createdAt: -1 }
  }) {
    const query = {
      partnerId,
      isDeleted: false,
      ...filter
    };

    const [theatres, total] = await Promise.all([
      Theatre.find(query)
        .populate('address.cityId', 'name slug state')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Theatre.countDocuments(query)
    ]);

    return { theatres, total };
  }

  /**
   * Query theatres across the platform for Super Admin with pagination and filters
   */
  static async findAdminTheatres({ filter = {}, skip = 0, limit = 20, sort = { createdAt: -1 } }) {
    const query = {
      isDeleted: false,
      ...filter
    };

    const [theatres, total] = await Promise.all([
      Theatre.find(query)
        .populate('partnerId', 'businessName businessEmail kycStatus')
        .populate('address.cityId', 'name slug state')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Theatre.countDocuments(query)
    ]);

    return { theatres, total };
  }

  /**
   * Query public catalog theatres (approved, active, not deleted)
   * Supports proximity search via MongoDB 2dsphere $near
   */
  static async findPublicTheatres({
    filter = {},
    coordinates = null,
    maxDistanceMeters = null,
    skip = 0,
    limit = 20,
    sort = { name: 1 }
  }) {
    const query = {
      status: { $in: PublicVisibleTheatreStatuses },
      isActive: true,
      isDeleted: false,
      ...filter
    };

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          ...(maxDistanceMeters ? { $maxDistance: maxDistanceMeters } : {})
        }
      };
      // When using $near, MongoDB requires sorting by distance automatically
      const [theatres, total] = await Promise.all([
        Theatre.find(query)
          .populate('address.cityId', 'name slug state isTopCity')
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        Theatre.countDocuments(query)
      ]);
      return { theatres, total };
    }

    const [theatres, total] = await Promise.all([
      Theatre.find(query)
        .populate('address.cityId', 'name slug state isTopCity')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Theatre.countDocuments(query)
    ]);

    return { theatres, total };
  }

  /**
   * Check if a theatreCode is already in use by another theatre for the same partner
   */
  static async isCodeTaken(theatreCode, partnerId, excludeTheatreId = null) {
    if (!theatreCode) {
      return false;
    }
    const query = {
      theatreCode: theatreCode.trim().toUpperCase(),
      partnerId,
      isDeleted: false
    };
    if (excludeTheatreId) {
      query._id = { $ne: excludeTheatreId };
    }
    const count = await Theatre.countDocuments(query);
    return count > 0;
  }

  /**
   * Update theatre by ID
   */
  static async update(theatreId, updateData) {
    return Theatre.findByIdAndUpdate(
      theatreId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('address.cityId', 'name slug state')
      .exec();
  }

  /**
   * Update theatre scoped to partner
   */
  static async updateWithPartner(theatreId, partnerId, updateData) {
    return Theatre.findOneAndUpdate(
      { _id: theatreId, partnerId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('address.cityId', 'name slug state')
      .exec();
  }

  /**
   * Soft delete theatre
   */
  static async softDelete(theatreId) {
    return Theatre.findByIdAndUpdate(
      theatreId,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false
        }
      },
      { new: true }
    ).exec();
  }

  /**
   * Soft delete theatre scoped to partner
   */
  static async softDeleteWithPartner(theatreId, partnerId) {
    return Theatre.findOneAndUpdate(
      { _id: theatreId, partnerId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false
        }
      },
      { new: true }
    ).exec();
  }

  /* ---------------- City Master Data Operations ---------------- */

  static async findCityById(cityId) {
    return City.findOne({ _id: cityId, isDeleted: false }).lean().exec();
  }

  static async findCityBySlug(slug) {
    return City.findOne({ slug: slug.toLowerCase().trim(), isDeleted: false }).lean().exec();
  }

  static async findActiveCities() {
    return City.find({ isActive: true, isDeleted: false })
      .sort({ isTopCity: -1, name: 1 })
      .lean()
      .exec();
  }

  static async createCity(cityData) {
    return City.create(cityData);
  }
}

export default TheatreRepository;
