import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true
    },
    familyId: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    revocationReason: {
      type: String,
      default: ''
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// TTL Index: Auto-purge expired session documents from MongoDB
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isRevoked: 1 });
sessionSchema.index({ familyId: 1, isRevoked: 1 });

export const Session = mongoose.model('user_sessions', sessionSchema);
export default Session;

