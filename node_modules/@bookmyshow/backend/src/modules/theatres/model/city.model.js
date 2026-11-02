import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      minlength: [2, 'City name must be at least 2 characters long'],
      maxlength: [100, 'City name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'City slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lower-case alphanumeric with hyphens']
    },
    state: {
      type: String,
      required: [true, 'State name is required'],
      trim: true,
      minlength: [2, 'State must be at least 2 characters long'],
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    isTopCity: {
      type: Boolean,
      default: false
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [0, 0]
      }
    },
    pincodes: {
      type: [String],
      default: []
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

citySchema.index({ coordinates: '2dsphere' });
citySchema.index({ isActive: 1, isTopCity: -1, name: 1 });

export const City = mongoose.model('cities', citySchema);
export default City;
