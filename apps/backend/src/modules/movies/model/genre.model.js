import mongoose from 'mongoose';

const genreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Genre name is required'],
      trim: true,
      minlength: [2, 'Genre name must be at least 2 characters'],
      maxlength: [50, 'Genre name cannot exceed 50 characters']
    },
    slug: {
      type: String,
      required: [true, 'Genre slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format (lowercase hyphenated)']
    },
    description: {
      type: String,
      trim: true,
      default: ''
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

// Unique compound/partial indexes for soft delete support
genreSchema.index({ slug: 1 }, { unique: true });
genreSchema.index({ name: 1 }, { unique: true });
genreSchema.index({ isActive: 1, deletedAt: 1 });

export const Genre = mongoose.model('genres', genreSchema);
export default Genre;

