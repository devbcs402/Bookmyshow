import mongoose from 'mongoose';
import { ScreenType, ScreenStatus } from './screen.constants.js';

const screenSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: [true, 'Theatre Partner (tenant ID) reference is required']
    },
    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatres',
      required: [true, 'Parent theatre reference is required']
    },
    name: {
      type: String,
      required: [true, 'Screen name is required'],
      trim: true,
      minlength: [1, 'Screen name must be at least 1 character long'],
      maxlength: [100, 'Screen name cannot exceed 100 characters']
    },
    screenNumber: {
      type: Number,
      required: [true, 'Screen number is required'],
      min: [1, 'Screen number must be a positive integer']
    },
    screenType: {
      type: String,
      enum: Object.values(ScreenType),
      default: ScreenType.STANDARD,
      required: true
    },
    supportedFormats: {
      type: [String],
      enum: ['2D', '3D', 'IMAX_2D', 'IMAX_3D', '4DX'],
      default: ['2D']
    },
    soundSystem: {
      type: String,
      trim: true,
      default: 'Dolby 7.1'
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    totalSeats: {
      type: Number,
      default: 0,
      min: 0
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
    layoutVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    status: {
      type: String,
      enum: Object.values(ScreenStatus),
      default: ScreenStatus.ACTIVE,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
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

// Indexes
screenSchema.index(
  { theatreId: 1, screenNumber: 1, deletedAt: 1 },
  { unique: true, name: 'idx_screens_unique_number_per_theatre' }
);
screenSchema.index(
  { partnerId: 1, theatreId: 1, isActive: 1 },
  { name: 'idx_screens_partner_theatre' }
);
screenSchema.index({ theatreId: 1, isActive: 1, isDeleted: 1 }, { name: 'idx_screens_lookup' });

export const Screen = mongoose.model('screens', screenSchema);
export default Screen;
