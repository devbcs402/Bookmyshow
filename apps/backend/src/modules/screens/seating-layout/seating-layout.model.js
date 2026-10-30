import mongoose from 'mongoose';
import { LayoutStatus, SeatType, SeatStatus } from '../screen.constants.js';

const layoutSeatSubSchema = new mongoose.Schema(
  {
    rowLabel: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    columnNumber: {
      type: Number,
      required: true,
      min: 1
    },
    seatLabel: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    categoryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'REGULAR'
    },
    type: {
      type: String,
      enum: Object.values(SeatType),
      default: SeatType.NORMAL
    },
    status: {
      type: String,
      enum: Object.values(SeatStatus),
      default: SeatStatus.ACTIVE
    },
    gridRow: {
      type: Number,
      required: true,
      min: 0
    },
    gridCol: {
      type: Number,
      required: true,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    accessibility: {
      isWheelchairAccessible: { type: Boolean, default: false },
      hasCompanionSeat: { type: Boolean, default: false },
      hasHearingLoop: { type: Boolean, default: false }
    }
  },
  { _id: false }
);

const categoryBreakdownSubSchema = new mongoose.Schema(
  {
    categoryCode: { type: String, required: true },
    count: { type: Number, default: 0 },
    bookableCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const seatingLayoutSchema = new mongoose.Schema(
  {
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'screens',
      required: [true, 'Screen reference is required']
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      required: [true, 'Theatre reference is required']
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: [true, 'Partner reference is required']
    },
    layoutVersion: {
      type: Number,
      required: [true, 'Layout version number is required'],
      default: 1,
      min: 1
    },
    name: {
      type: String,
      trim: true,
      default: 'Default Seating Layout'
    },
    status: {
      type: String,
      enum: Object.values(LayoutStatus),
      default: LayoutStatus.DRAFT,
      required: true
    },
    totalRows: {
      type: Number,
      default: 0,
      min: 0
    },
    totalColumns: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: 0
    },
    bookableSeats: {
      type: Number,
      default: 0,
      min: 0
    },
    seats: {
      type: [layoutSeatSubSchema],
      default: []
    },
    categoryBreakdown: {
      type: [categoryBreakdownSubSchema],
      default: []
    },
    publishedAt: {
      type: Date,
      default: null
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
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

seatingLayoutSchema.index(
  { screenId: 1, layoutVersion: 1 },
  { unique: true, name: 'idx_unique_layout_version_per_screen' }
);
seatingLayoutSchema.index({ screenId: 1, status: 1 }, { name: 'idx_seating_layout_screen_status' });
seatingLayoutSchema.index(
  { partnerId: 1, theatreId: 1 },
  { name: 'idx_seating_layout_tenant_theatre' }
);

export const SeatingLayout = mongoose.model('seating_layouts', seatingLayoutSchema);
export default SeatingLayout;
