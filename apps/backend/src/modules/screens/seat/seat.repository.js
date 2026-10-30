import Seat from './seat.model.js';

export class SeatRepository {
  /**
   * Bulk insert physical seats into collection
   */
  static async bulkInsert(seats, session = null) {
    const options = session ? { session } : {};
    return Seat.insertMany(seats, options);
  }

  /**
   * Find all physical seats for a screen and layout version
   */
  static async findSeatsByScreenAndVersion(screenId, layoutVersion, filter = {}) {
    return Seat.find({
      screenId,
      layoutVersion,
      ...filter
    })
      .sort({ gridRow: 1, gridCol: 1 })
      .exec();
  }

  /**
   * Find seat by ID
   */
  static async findById(seatId) {
    return Seat.findById(seatId).exec();
  }

  /**
   * Find seat by ID scoped to partner
   */
  static async findByIdAndPartnerId(seatId, partnerId) {
    return Seat.findOne({ _id: seatId, partnerId }).exec();
  }

  /**
   * Update seat by ID
   */
  static async updateById(seatId, updateData) {
    return Seat.findByIdAndUpdate(seatId, updateData, {
      new: true,
      runValidators: true
    }).exec();
  }

  /**
   * Count seats for screen and version
   */
  static async countSeatsByScreenAndVersion(screenId, layoutVersion, filter = {}) {
    return Seat.countDocuments({
      screenId,
      layoutVersion,
      ...filter
    }).exec();
  }

  /**
   * Delete seats for screen and version (e.g. for rollback)
   */
  static async deleteByScreenAndVersion(screenId, layoutVersion, session = null) {
    const options = session ? { session } : {};
    return Seat.deleteMany({ screenId, layoutVersion }, options).exec();
  }
}

export default SeatRepository;

