import mongoose from 'mongoose';

const seatCategorySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      default: null // null indicates a platform-wide default category
    },
    name: {
      type: String,
      required: [true, 'Seat category name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Seat category code is required'],
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9_]{2,30}$/,
        'Category code must be 2-30 uppercase alphanumeric characters or underscores'
      ]
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    displayColor: {
      type: String,
      default: '#3B82F6',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Display color must be a valid hex color code']
    },
    basePrice: {
      type: Number,
      default: 200,
      min: [0, 'Base price cannot be negative']
    },
    sortOrder: {
      type: Number,
      default: 1,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

seatCategorySchema.index(
  { partnerId: 1, code: 1, deletedAt: 1 },
  { unique: true, name: 'idx_seat_categories_unique_partner_code' }
);
seatCategorySchema.index({ isActive: 1, sortOrder: 1 });

export const SeatCategory = mongoose.model('seat_categories', seatCategorySchema);
export default SeatCategory;
