import mongoose from 'mongoose';

const showPricingSchema = new mongoose.Schema(
  {
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shows',
      required: [true, 'Show reference is required']
    },
    screenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'screens',
      required: [true, 'Screen reference is required']
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      required: [true, 'Partner reference is required']
    },
    categoryCode: {
      type: String,
      required: [true, 'Seat category code is required'],
      uppercase: true,
      trim: true
    },
    categoryName: {
      type: String,
      default: '',
      trim: true
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
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
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    effectivePrice: {
      type: Number,
      required: true,
      min: 0
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

showPricingSchema.index(
  { showId: 1, categoryCode: 1 },
  { unique: true, name: 'idx_unique_category_pricing_per_show' }
);
showPricingSchema.index({ partnerId: 1, showId: 1 });

export const ShowPricing = mongoose.model('show_pricing', showPricingSchema);
export default ShowPricing;

