import mongoose from 'mongoose';
import { SeatType, SeatStatus } from '../screen.constants.js';

const accessibilitySubSchema = new mongoose.Schema(
  {
    isWheelchairAccessible: {
      type: Boolean,
      default: false
    },
    hasCompanionSeat: {
      type: Boolean,
      default: false
    },
    hasHearingLoop: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const seatSchema = new mongoose.Schema(
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
      required: [true, 'Partner tenant reference is required']
    },
    layoutVersion: {
      type: Number,
      required: [true, 'Layout version number is required'],
      default: 1,
      min: 1
    },
    rowLabel: {
      type: String,
      required: [true, 'Row label is required'],
      uppercase: true,
      trim: true,
      maxlength: [4, 'Row label cannot exceed 4 characters']
    },
    columnNumber: {
      type: Number,
      required: [true, 'Column number is required'],
      min: [1, 'Column number must be >= 1']
    },
    seatLabel: {
      type: String,
      required: [true, 'Seat label is required'],
      uppercase: true,
      trim: true,
      maxlength: [10, 'Seat label cannot exceed 10 characters']
    },
    categoryCode: {
      type: String,
      required: [true, 'Category code is required'],
      uppercase: true,
      trim: true,
      default: 'REGULAR'
    },
    type: {
      type: String,
      enum: Object.values(SeatType),
      default: SeatType.NORMAL,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(SeatStatus),
      default: SeatStatus.ACTIVE,
      required: true
    },
    gridRow: {
      type: Number,
      required: [true, 'Grid row coordinate (Y) is required'],
      min: 0
    },
    gridCol: {
      type: Number,
      required: [true, 'Grid column coordinate (X) is required'],
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    accessibility: {
      type: accessibilitySubSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound Unique Indexes to enforce physical seat invariants
seatSchema.index(
  { screenId: 1, layoutVersion: 1, seatLabel: 1 },
  { unique: true, name: 'idx_unique_seat_label_per_layout' }
);
seatSchema.index(
  { screenId: 1, layoutVersion: 1, gridRow: 1, gridCol: 1 },
  { unique: true, name: 'idx_unique_grid_position_per_layout' }
);
seatSchema.index(
  { screenId: 1, layoutVersion: 1, isAvailable: 1 },
  { name: 'idx_screen_layout_available_seats' }
);
seatSchema.index({ partnerId: 1, theatreId: 1 }, { name: 'idx_seats_tenant_theatre' });

export const Seat = mongoose.model('seats', seatSchema);
export default Seat;
