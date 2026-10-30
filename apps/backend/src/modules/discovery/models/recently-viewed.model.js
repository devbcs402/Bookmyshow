import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
      index: true
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'movies',
      required: [true, 'Movie ID is required'],
      index: true
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Prevent duplicate movie entries per customer: updates update viewedAt
recentlyViewedSchema.index({ userId: 1, movieId: 1 }, { unique: true });

// Fast customer feed ordering index
recentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

export const RecentlyViewed =
  mongoose.models.recently_viewed || mongoose.model('recently_viewed', recentlyViewedSchema);

export default RecentlyViewed;

