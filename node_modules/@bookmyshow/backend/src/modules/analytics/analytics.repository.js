import mongoose from 'mongoose';
import { BookingModel as Booking } from '../bookings/model/booking.model.js';
import { User } from '../users/model/user.model.js';
import { Theatre } from '../theatres/model/theatre.model.js';
import { Movie } from '../movies/model/movie.model.js';
import { Show } from '../shows/show.model.js';
import { TimeRange } from './analytics.constants.js';

export const computeDateBoundaries = (timeRange = TimeRange.LAST_7_DAYS, startDate, endDate) => {
  const now = new Date();
  let start;
  let end = new Date(now);

  switch (timeRange) {
    case TimeRange.TODAY: {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );
      break;
    }
    case TimeRange.YESTERDAY: {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0)
      );
      end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999)
      );
      break;
    }
    case TimeRange.LAST_7_DAYS: {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case TimeRange.LAST_30_DAYS: {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case TimeRange.THIS_MONTH: {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      break;
    }
    case TimeRange.PREV_MONTH: {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      break;
    }
    case TimeRange.CUSTOM: {
      start = new Date(startDate);
      end = new Date(endDate);
      break;
    }
    default: {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
};

export class AnalyticsRepository {
  static async getAdminOverview({ timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);

    const [
      totalUsers,
      activeUsers,
      totalTheatres,
      activeTheatres,
      totalMovies,
      publishedShows,
      bookingAggregates
    ] = await Promise.all([
      User.countDocuments().exec(),
      User.countDocuments({ isActive: true }).exec(),
      Theatre.countDocuments().exec(),
      Theatre.countDocuments({ status: 'APPROVED' }).exec(),
      Movie.countDocuments().exec(),
      Show.countDocuments({ status: 'PUBLISHED', startTime: { $gte: start, $lte: end } }).exec(),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            expiredBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] }
            },
            failedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            },
            grossBookingValue: { $sum: '$netPayableAmount' },
            capturedPaymentValue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
              }
            },
            refundValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'CANCELLED'] },
                  { $ifNull: ['$cancellationDetails.refundAmount', 0] },
                  0
                ]
              }
            },
            platformCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$convenienceFee', 0]
              }
            },
            ticketsSold: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$totalSeats', 0]
              }
            }
          }
        }
      ]).exec()
    ]);

    const stats = bookingAggregates[0] || {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      expiredBookings: 0,
      failedBookings: 0,
      grossBookingValue: 0,
      capturedPaymentValue: 0,
      refundValue: 0,
      platformCommission: 0,
      ticketsSold: 0
    };

    const theatreSettlement = Math.max(
      0,
      stats.capturedPaymentValue - stats.platformCommission - stats.refundValue
    );

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      platform: {
        totalUsers,
        activeUsers,
        totalTheatres,
        activeTheatres,
        totalMovies,
        publishedShows
      },
      bookings: {
        total: stats.totalBookings,
        confirmed: stats.confirmedBookings,
        cancelled: stats.cancelledBookings,
        expired: stats.expiredBookings,
        failed: stats.failedBookings,
        ticketsSold: stats.ticketsSold
      },
      revenue: {
        currency: 'INR',
        grossBookingValue: stats.grossBookingValue,
        capturedPaymentValue: stats.capturedPaymentValue,
        refundValue: stats.refundValue,
        platformCommission: stats.platformCommission,
        theatreSettlement,
        netPlatformRevenue: stats.platformCommission
      }
    };
  }

  static async getAdminBookings({ timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);

    const [breakdown, dailyTrend] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            seatsCount: { $sum: '$totalSeats' },
            amount: { $sum: '$netPayableAmount' }
          }
        }
      ]).exec(),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            grossAmount: { $sum: '$netPayableAmount' },
            ticketsSold: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$totalSeats', 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).exec()
    ]);

    let total = 0;
    let confirmed = 0;
    let cancelled = 0;
    let totalConfirmedSeats = 0;

    const statusCounts = {};
    for (const item of breakdown) {
      statusCounts[item._id] = item.count;
      total += item.count;
      if (item._id === 'CONFIRMED') {
        confirmed += item.count;
        totalConfirmedSeats += item.seatsCount;
      } else if (item._id === 'CANCELLED') {
        cancelled += item.count;
      }
    }

    const cancellationRate = total > 0 ? Number(((cancelled / total) * 100).toFixed(2)) : 0;
    const avgSeatsPerConfirmedBooking =
      confirmed > 0 ? Number((totalConfirmedSeats / confirmed).toFixed(2)) : 0;

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        total,
        confirmed,
        cancelled,
        cancellationRatePercent: cancellationRate,
        avgSeatsPerConfirmedBooking
      },
      statusBreakdown: statusCounts,
      dailyTrend: dailyTrend.map(d => ({
        date: d._id,
        total: d.totalBookings,
        confirmed: d.confirmedBookings,
        cancelled: d.cancelledBookings,
        grossAmount: d.grossAmount,
        ticketsSold: d.ticketsSold
      }))
    };
  }

  static async getAdminRevenue({ timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);

    const [aggregateResult, dailyRevenue] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            grossBookingValue: { $sum: '$netPayableAmount' },
            capturedPaymentValue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
              }
            },
            refundValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'CANCELLED'] },
                  { $ifNull: ['$cancellationDetails.refundAmount', 0] },
                  0
                ]
              }
            },
            platformCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$convenienceFee', 0]
              }
            }
          }
        }
      ]).exec(),
      Booking.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            grossBookingValue: { $sum: '$netPayableAmount' },
            capturedPaymentValue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
              }
            },
            refundValue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'CANCELLED'] },
                  { $ifNull: ['$cancellationDetails.refundAmount', 0] },
                  0
                ]
              }
            },
            platformCommission: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$convenienceFee', 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).exec()
    ]);

    const stats = aggregateResult[0] || {
      grossBookingValue: 0,
      capturedPaymentValue: 0,
      refundValue: 0,
      platformCommission: 0
    };

    const theatreSettlement = Math.max(
      0,
      stats.capturedPaymentValue - stats.platformCommission - stats.refundValue
    );

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      accounting: {
        currency: 'INR',
        definitions: {
          grossBookingValue: 'Total value of all submitted bookings regardless of status',
          capturedPaymentValue: 'Realized monetary payments for confirmed bookings',
          refundValue: 'Total value of funds returned to customers for cancelled bookings',
          platformCommission: 'Convenience fees retained by the platform',
          theatreSettlement:
            'Net settlement due to theatre partners (captured - commission - refunds)',
          netPlatformRevenue: 'Actual revenue recognized by the platform (platformCommission)'
        },
        grossBookingValue: stats.grossBookingValue,
        capturedPaymentValue: stats.capturedPaymentValue,
        refundValue: stats.refundValue,
        platformCommission: stats.platformCommission,
        theatreSettlement,
        netPlatformRevenue: stats.platformCommission
      },
      dailyRevenue: dailyRevenue.map(d => ({
        date: d._id,
        gross: d.grossBookingValue,
        captured: d.capturedPaymentValue,
        refunded: d.refundValue,
        commission: d.platformCommission,
        settlement: Math.max(0, d.capturedPaymentValue - d.platformCommission - d.refundValue)
      }))
    };
  }

  static async getAdminMovies({ timeRange, startDate, endDate, limit = 10 }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);

    const movies = await Booking.aggregate([
      { $match: { status: 'CONFIRMED', createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$movieId',
          confirmedBookings: { $sum: 1 },
          ticketsSold: { $sum: '$totalSeats' },
          grossRevenue: { $sum: '$netPayableAmount' },
          movieTitle: { $first: '$snapshot.movieTitle' }
        }
      },
      { $sort: { ticketsSold: -1 } },
      { $limit: limit }
    ]).exec();

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      movies: movies.map(m => ({
        movieId: m._id,
        title: m.movieTitle || 'Unknown Movie',
        confirmedBookings: m.confirmedBookings,
        ticketsSold: m.ticketsSold,
        revenue: m.grossRevenue
      }))
    };
  }

  static async getAdminTheatres({ timeRange, startDate, endDate, limit = 10 }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);

    const theatres = await Booking.aggregate([
      { $match: { status: 'CONFIRMED', createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$theatreId',
          confirmedBookings: { $sum: 1 },
          ticketsSold: { $sum: '$totalSeats' },
          grossRevenue: { $sum: '$netPayableAmount' },
          theatreName: { $first: '$snapshot.theatreName' }
        }
      },
      { $sort: { grossRevenue: -1 } },
      { $limit: limit }
    ]).exec();

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      theatres: theatres.map(t => ({
        theatreId: t._id,
        name: t.theatreName || 'Unknown Theatre',
        confirmedBookings: t.confirmedBookings,
        ticketsSold: t.ticketsSold,
        revenue: t.grossRevenue
      }))
    };
  }

  /* =========================================================================
   * THEATRE OWNER ISOLATED REPOSITORY METHODS
   * ========================================================================= */
  static async getTheatreOwnerOverview(partnerId, { timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

    const [showsCount, bookingAggregates] = await Promise.all([
      Show.countDocuments({
        partnerId: partnerObjectId,
        status: 'PUBLISHED',
        startTime: { $gte: start, $lte: end }
      }).exec(),
      Booking.aggregate([
        {
          $match: {
            partnerId: partnerObjectId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
            },
            grossSales: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
              }
            },
            refundAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'CANCELLED'] },
                  { $ifNull: ['$cancellationDetails.refundAmount', 0] },
                  0
                ]
              }
            },
            platformFees: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$convenienceFee', 0]
              }
            },
            ticketsSold: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$totalSeats', 0]
              }
            }
          }
        }
      ]).exec()
    ]);

    const stats = bookingAggregates[0] || {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      grossSales: 0,
      refundAmount: 0,
      platformFees: 0,
      ticketsSold: 0
    };

    const netSettlement = Math.max(0, stats.grossSales - stats.platformFees - stats.refundAmount);

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      partnerId: String(partnerId),
      performance: {
        activePublishedShows: showsCount,
        totalBookings: stats.totalBookings,
        confirmedBookings: stats.confirmedBookings,
        cancelledBookings: stats.cancelledBookings,
        ticketsSold: stats.ticketsSold
      },
      settlement: {
        currency: 'INR',
        grossSales: stats.grossSales,
        platformFeesDeducted: stats.platformFees,
        refundsDeducted: stats.refundAmount,
        netPayableToPartner: netSettlement
      }
    };
  }

  static async getTheatreOwnerBookings(partnerId, { timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

    const [breakdown, dailyTrend] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            partnerId: partnerObjectId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            seatsCount: { $sum: '$totalSeats' },
            amount: { $sum: '$netPayableAmount' }
          }
        }
      ]).exec(),
      Booking.aggregate([
        {
          $match: {
            partnerId: partnerObjectId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] }
            },
            ticketsSold: {
              $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$totalSeats', 0] }
            },
            grossSales: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]).exec()
    ]);

    const statusCounts = {};
    for (const item of breakdown) {
      statusCounts[item._id] = item.count;
    }

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      partnerId: String(partnerId),
      statusBreakdown: statusCounts,
      dailyTrend: dailyTrend.map(d => ({
        date: d._id,
        total: d.totalBookings,
        confirmed: d.confirmedBookings,
        ticketsSold: d.ticketsSold,
        sales: d.grossSales
      }))
    };
  }

  static async getTheatreOwnerRevenue(partnerId, { timeRange, startDate, endDate }) {
    const { start, end } = computeDateBoundaries(timeRange, startDate, endDate);
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

    const revenueResult = await Booking.aggregate([
      {
        $match: {
          partnerId: partnerObjectId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          grossSales: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$netPayableAmount', 0]
            }
          },
          refunds: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'CANCELLED'] },
                { $ifNull: ['$cancellationDetails.refundAmount', 0] },
                0
              ]
            }
          },
          platformFees: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CONFIRMED'] }, '$convenienceFee', 0]
            }
          }
        }
      }
    ]).exec();

    const stats = revenueResult[0] || {
      grossSales: 0,
      refunds: 0,
      platformFees: 0
    };

    const netSettlement = Math.max(0, stats.grossSales - stats.platformFees - stats.refunds);

    return {
      period: { timeRange, startDate: start.toISOString(), endDate: end.toISOString() },
      partnerId: String(partnerId),
      currency: 'INR',
      grossSales: stats.grossSales,
      platformFees: stats.platformFees,
      refunds: stats.refunds,
      netSettlement
    };
  }
}

export default AnalyticsRepository;
