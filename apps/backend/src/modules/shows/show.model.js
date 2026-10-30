import mongoose from 'mongoose';
import {
  ShowStatus,
  ShowFormat,
  ShowType,
  DefaultCleanupBufferMinutes,
  DefaultTimezone
} from './show.constants.js';

const pricingTierSubSchema = new mongoose.Schema(
  {
    categoryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    categoryName: {
      type: String,
      required: true,
      trim: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: [0, 'Base price cannot be negative']
    },
    convenienceFee: {
      type: Number,
      default: 0,
      min: [0, 'Convenience fee cannot be negative']
    },
    taxPercent: {
      type: Number,
      default: 18.0,
      min: [0, 'Tax percent cannot be negative']
    },
    effectivePrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const movieSnapshotSubSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    posterUrl: { type: String, default: '' },
    durationMins: { type: Number, required: true },
    censorRating: { type: String, default: 'UA' }
  },
  { _id: false }
);

const rescheduleHistorySubSchema = new mongoose.Schema(
  {
    previousStartTime: { type: Date, required: true },
    previousEndTime: { type: Date, required: true },
    rescheduledAt: { type: Date, default: Date.now },
    rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    reason: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: [true, 'Partner reference is required']
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      required: [true, 'Theatre reference is required']
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      default: null
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'screens',
      required: [true, 'Screen reference is required']
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'movies',
      required: [true, 'Movie reference is required']
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cities',
      required: [true, 'City reference is required']
    },
    movieSnapshot: {
      type: movieSnapshotSubSchema,
      required: true
    },
    showDate: {
      type: Date,
      required: [true, 'Show calendar date is required']
    },
    startTime: {
      type: Date,
      required: [true, 'Show start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'Show end time is required']
    },
    cleanupBufferMinutes: {
      type: Number,
      default: DefaultCleanupBufferMinutes,
      min: 0
    },
    occupiedEndTime: {
      type: Date,
      required: [true, 'Occupied end time (including buffer) is required']
    },
    timezone: {
      type: String,
      default: DefaultTimezone,
      trim: true
    },
    bookingOpensAt: {
      type: Date,
      default: null
    },
    bookingClosesAt: {
      type: Date,
      default: null
    },
    format: {
      type: String,
      enum: Object.values(ShowFormat),
      default: ShowFormat.TWO_D,
      required: true
    },
    language: {
      type: String,
      required: [true, 'Spoken language is required'],
      trim: true
    },
    subtitleLanguage: {
      type: String,
      default: 'None',
      trim: true
    },
    audioFormat: {
      type: String,
      default: 'Dolby 7.1',
      trim: true
    },
    showType: {
      type: String,
      enum: Object.values(ShowType),
      default: ShowType.REGULAR
    },
    layoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'seating_layouts',
      required: [true, 'Seating layout reference is required']
    },
    layoutVersion: {
      type: Number,
      required: [true, 'Layout version number is required'],
      default: 1
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: 0
    },
    availableSeats: {
      type: Number,
      default: 0,
      min: 0
    },
    pricingTiers: {
      type: [pricingTierSubSchema],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(ShowStatus),
      default: ShowStatus.DRAFT,
      required: true
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    rescheduleHistory: {
      type: [rescheduleHistorySubSchema],
      default: []
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// High-performance operational and public indexes
showSchema.index(
  { screenId: 1, startTime: 1, occupiedEndTime: 1, status: 1 },
  { name: 'idx_shows_conflict_lookup' }
);
showSchema.index(
  { cityId: 1, movieId: 1, showDate: 1, status: 1 },
  { name: 'idx_shows_customer_city_movie_search' }
);
showSchema.index(
  { theatreId: 1, showDate: 1, startTime: 1 },
  { name: 'idx_shows_theatre_daily_schedule' }
);
showSchema.index({ partnerId: 1, showDate: -1 }, { name: 'idx_shows_partner_tenant' });
showSchema.index({ movieId: 1, status: 1 }, { name: 'idx_shows_movie_status' });

export const Show = mongoose.model('shows', showSchema);
export default Show;
