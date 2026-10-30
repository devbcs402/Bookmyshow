import Show from '../shows/show.model.js';
import Seat from '../screens/seat/seat.model.js';
import SeatingLayout from '../screens/seating-layout/seating-layout.model.js';
import BookingModel from './booking-boundary.model.js';
import { BookingStatus } from './seat-lock.constants.js';

export class SeatLockRepository {
  /**
   * Finds a show by its primary ID.
   * @param {string} showId
   * @returns {Promise<Object|null>}
   */
  async findShowById(showId) {
    return Show.findById(showId).lean();
  }

  /**
   * Retrieves all physical seats for a specific screen and layout version.
   * @param {string} screenId
   * @param {number} layoutVersion
   * @returns {Promise<Array<Object>>}
   */
  async findSeatsByScreenAndVersion(screenId, layoutVersion) {
    return Seat.find({
      screenId,
      layoutVersion
    })
      .sort({ gridRow: 1, gridCol: 1 })
      .lean();
  }

  /**
   * Retrieves specific physical seats for validation during lock acquisition.
   * @param {string} screenId
   * @param {number} layoutVersion
   * @param {Array<string>} seatIds
   * @returns {Promise<Array<Object>>}
   */
  async findSeatsByIds(screenId, layoutVersion, seatIds) {
    return Seat.find({
      _id: { $in: seatIds },
      screenId,
      layoutVersion
    }).lean();
  }

  /**
   * Retrieves all confirmed and pending-payment booked seat IDs for a show from MongoDB durable truth.
   * @param {string} showId
   * @returns {Promise<Set<string>>}
   */
  async findBookedSeatIdsForShow(showId) {
    const bookings = await BookingModel.find(
      {
        showId,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] }
      },
      { 'seats.seatId': 1 }
    ).lean();

    const bookedSeatIds = new Set();
    for (const booking of bookings) {
      if (Array.isArray(booking.seats)) {
        for (const seat of booking.seats) {
          if (seat.seatId) {
            bookedSeatIds.add(seat.seatId.toString());
          }
        }
      }
    }

    return bookedSeatIds;
  }

  /**
   * Checks if any of the given seat IDs are already booked for a specific show.
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @returns {Promise<Array<string>>} Conflicting seat IDs that are booked
   */
  async findConflictingBookedSeats(showId, seatIds) {
    const bookings = await BookingModel.find(
      {
        showId,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
        'seats.seatId': { $in: seatIds }
      },
      { 'seats.seatId': 1 }
    ).lean();

    const conflictingSeatIds = [];
    const requestedSet = new Set(seatIds.map(id => id.toString()));

    for (const booking of bookings) {
      if (Array.isArray(booking.seats)) {
        for (const seat of booking.seats) {
          const seatIdStr = seat.seatId?.toString();
          if (seatIdStr && requestedSet.has(seatIdStr)) {
            conflictingSeatIds.push(seatIdStr);
          }
        }
      }
    }

    return conflictingSeatIds;
  }

  /**
   * Finds the seating layout template metadata.
   * @param {string} layoutId
   * @returns {Promise<Object|null>}
   */
  async findLayoutById(layoutId) {
    return SeatingLayout.findById(layoutId).lean();
  }
}

export default new SeatLockRepository();
