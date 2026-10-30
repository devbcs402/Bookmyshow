import mongoose from 'mongoose';
import { BookingStatus, BookingSeatStatus } from '../booking.constants.js';

const bookingSeatPriceSnapshotSchema = new mongoose.Schema(
  {
    basePrice: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const bookingSeatLineItemSchema = new mongoose.Schema(
  {
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'seats',
      required: true
    },
    seatLabel: {
      type: String,
      required: true,
      trim: true
    },
    rowLabel: {
      type: String,
      default: '',
      trim: true
    },
    columnNumber: {
      type: Number,
      default: 0
    },
    categoryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    categoryName: {
      type: String,
      default: '',
      trim: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    priceSnapshot: {
      type: bookingSeatPriceSnapshotSchema,
      default: null
    },
    status: {
      type: String,
      enum: Object.values(BookingSeatStatus),
      default: BookingSeatStatus.RESERVED
    }
  },
  { _id: false }
);

const bookingSnapshotSchema = new mongoose.Schema(
  {
    movieTitle: { type: String, required: true, trim: true },
    moviePosterUrl: { type: String, default: '', trim: true },
    censorRating: { type: String, default: 'UA', trim: true },
    durationMins: { type: Number, default: 0 },
    format: { type: String, default: '2D', trim: true },
    language: { type: String, default: 'English', trim: true },
    theatreName: { type: String, required: true, trim: true },
    theatreAddress: { type: String, default: '', trim: true },
    screenName: { type: String, required: true, trim: true },
    showStartTime: { type: Date, required: true },
    showEndTime: { type: Date, required: true },
    seatSummary: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const cancellationDetailsSchema = new mongoose.Schema(
  {
    cancelledAt: { type: Date, default: Date.now },
    reason: { type: String, default: '', trim: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    refundPercentage: { type: Number, default: 100, min: 0, max: 100 },
    refundAmount: { type: Number, default: 0, min: 0 },
    nonRefundableFee: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: true,
      index: true
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      default: null
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'screens',
      required: true,
      index: true
    },
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shows',
      required: true,
      index: true
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'movies',
      required: true,
      index: true
    },
    seats: {
      type: [bookingSeatLineItemSchema],
      required: true,
      validate: [val => Array.isArray(val) && val.length > 0, 'At least one seat is required']
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },
    convenienceFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    netPayableAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING_PAYMENT,
      index: true
    },
    snapshot: {
      type: bookingSnapshotSchema,
      required: true
    },
    qrCodePayload: {
      type: String,
      default: '',
      trim: true
    },
    pdfTicketUrl: {
      type: String,
      default: '',
      trim: true
    },
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    cancellation: {
      type: cancellationDetailsSchema,
      default: null
    },
    paymentDetails: {
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
      gateway: { type: String, default: 'RAZORPAY' },
      razorpayPaymentId: { type: String, default: null },
      razorpayOrderId: { type: String, default: null },
      paidAmount: { type: Number, default: 0 },
      paidAt: { type: Date, default: null }
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// High-concurrency compound index for seat availability reconciliation
bookingSchema.index(
  { showId: 1, status: 1, 'seats.seatId': 1 },
  { name: 'idx_bookings_show_status_seat_lookup' }
);

// Compound unique partial index: GUARANTEES ZERO DOUBLE-BOOKING ON ACTIVE RESERVATIONS
bookingSchema.index(
  { showId: 1, 'seats.seatId': 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] }
    },
    name: 'uniq_active_show_seat_reservation'
  }
);

// Customer booking history index
bookingSchema.index({ customerId: 1, createdAt: -1 }, { name: 'idx_bookings_customer_history' });

// Partner tenant reporting index
bookingSchema.index({ partnerId: 1, createdAt: -1 }, { name: 'idx_bookings_partner_reporting' });

// Theatre bookings index
bookingSchema.index({ theatreId: 1, createdAt: -1 }, { name: 'idx_bookings_theatre_reporting' });

// Background expiration sweep index
bookingSchema.index({ status: 1, expiresAt: 1 }, { name: 'idx_bookings_status_expiration' });

// Customer idempotency lookup index
bookingSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  { name: 'idx_bookings_customer_idempotency', sparse: true }
);

// Discovery trending & popularity aggregation index
bookingSchema.index(
  { status: 1, createdAt: -1, movieId: 1 },
  { name: 'idx_bookings_status_created_movie' }
);

export const BookingModel = mongoose.models.bookings || mongoose.model('bookings', bookingSchema);

export default BookingModel;
