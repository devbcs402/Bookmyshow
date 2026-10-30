import BookingModel from './model/booking.model.js';
import { BookingStatus } from './booking.constants.js';

export class BookingRepository {
  /**
   * Creates a new booking document inside an optional MongoDB transaction session.
   * @param {Object} bookingData
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>}
   */
  async create(bookingData, session = null) {
    const options = session ? { session } : {};
    const [booking] = await BookingModel.create([bookingData], options);
    return booking;
  }

  /**
   * Retrieves a booking by its primary MongoDB ObjectId.
   * @param {string} bookingId
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async findById(bookingId, session = null) {
    const query = BookingModel.findById(bookingId);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  /**
   * Retrieves a booking by its customer-facing alphanumeric reference / PNR.
   * @param {string} reference
   * @returns {Promise<Object|null>}
   */
  async findByReference(reference) {
    return BookingModel.findOne({ bookingReference: reference.toUpperCase() }).exec();
  }

  /**
   * Checks if a booking reference is already taken.
   * @param {string} reference
   * @returns {Promise<boolean>}
   */
  async existsByReference(reference) {
    const count = await BookingModel.countDocuments({ bookingReference: reference.toUpperCase() });
    return count > 0;
  }

  /**
   * Queries paginated bookings for a customer with optional filters and sorting.
   * @param {string} customerId
   * @param {Object} [options]
   * @returns {Promise<{ bookings: Array<Object>, total: number }>}
   */
  async findCustomerBookings(customerId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const filter = { customerId };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      BookingModel.countDocuments(filter)
    ]);

    return { bookings, total };
  }

  /**
   * Queries paginated bookings for a theatre partner (theatre owner) with tenant boundary enforcement.
   * @param {string} partnerId
   * @param {Object} [options]
   * @returns {Promise<{ bookings: Array<Object>, total: number }>}
   */
  async findPartnerBookings(partnerId, options = {}) {
    const {
      theatreId,
      showId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const filter = { partnerId };

    if (theatreId) {
      filter.theatreId = theatreId;
    }
    if (showId) {
      filter.showId = showId;
    }
    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
      BookingModel.countDocuments(filter)
    ]);

    return { bookings, total };
  }

  /**
   * Retrieves pending payment bookings that have passed their expiration timestamp.
   * @param {number} [limit=100]
   * @returns {Promise<Array<Object>>}
   */
  async findExpiredPendingBookings(limit = 100) {
    return BookingModel.find({
      status: BookingStatus.PENDING_PAYMENT,
      expiresAt: { $lte: new Date() }
    })
      .limit(limit)
      .exec();
  }

  /**
   * Checks if any of the given seat IDs are already reserved or booked for a show in MongoDB.
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @param {string|null} [excludeBookingId=null]
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Array<Object>>}
   */
  async findConflictingActiveBookings(showId, seatIds, excludeBookingId = null, session = null) {
    const filter = {
      showId,
      status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      'seats.seatId': { $in: seatIds }
    };

    if (excludeBookingId) {
      filter._id = { $ne: excludeBookingId };
    }

    const query = BookingModel.find(filter, { 'seats.seatId': 1, status: 1, bookingReference: 1 });
    if (session) {
      query.session(session);
    }

    return query.lean();
  }

  /**
   * Atomically transitions a booking's status inside a MongoDB session.
   * @param {string} bookingId
   * @param {string} newStatus
   * @param {Object} statusHistoryEntry
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async updateStatus(bookingId, newStatus, statusHistoryEntry, session = null) {
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    return BookingModel.findByIdAndUpdate(
      bookingId,
      {
        $set: { status: newStatus },
        $push: { statusHistory: statusHistoryEntry }
      },
      options
    );
  }

  /**
   * Atomically cancels a booking with cancellation metadata.
   * @param {string} bookingId
   * @param {Object} cancellationDetails
   * @param {Object} statusHistoryEntry
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object|null>}
   */
  async cancelBooking(bookingId, cancellationDetails, statusHistoryEntry, session = null) {
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    return BookingModel.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          status: BookingStatus.CANCELLED,
          cancellation: cancellationDetails,
          'seats.$[].status': 'CANCELLED'
        },
        $push: { statusHistory: statusHistoryEntry }
      },
      options
    );
  }
}

export const bookingRepository = new BookingRepository();
export default bookingRepository;
