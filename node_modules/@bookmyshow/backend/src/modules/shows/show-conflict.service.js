import Show from './show.model.js';
import { ShowStatus } from './show.constants.js';

export class ShowConflictService {
  /**
   * Evaluates whether a target time interval conflicts with any existing active show on a screen.
   *
   * Temporal interval collision formula:
   * Collision <=> (existingStart < newOccupiedEnd) AND (existingOccupiedEnd > newStart)
   *
   * @param {string|ObjectId} screenId - Target screen
   * @param {Date} startTime - New show start time
   * @param {Date} occupiedEndTime - New show conclusion time including cleanup buffer
   * @param {string|ObjectId} [excludeShowId=null] - Optional show ID to exclude (for rescheduling)
   * @param {ClientSession} [session=null] - Optional MongoDB transaction session
   * @returns {Promise<{ hasConflict: boolean, conflictingShow: Object|null }>}
   */
  static async checkScreenConflict(
    screenId,
    startTime,
    occupiedEndTime,
    excludeShowId = null,
    session = null
  ) {
    const query = {
      screenId,
      isDeleted: false,
      status: { $ne: ShowStatus.CANCELLED },
      startTime: { $lt: occupiedEndTime },
      occupiedEndTime: { $gt: startTime }
    };

    if (excludeShowId) {
      query._id = { $ne: excludeShowId };
    }

    const options = session ? { session } : {};
    const conflictingShow = await Show.findOne(query, null, options)
      .populate('movieId', 'title')
      .exec();

    return {
      hasConflict: Boolean(conflictingShow),
      conflictingShow
    };
  }
}

export default ShowConflictService;
