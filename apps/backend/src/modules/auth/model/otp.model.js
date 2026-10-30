import mongoose from 'mongoose';
import { OtpPurpose, OtpTargetType } from '../auth.constants.js';

const otpVerificationSchema = new mongoose.Schema(
  {
    target: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    targetType: {
      type: String,
      enum: Object.values(OtpTargetType),
      required: true
    },
    purpose: {
      type: String,
      enum: Object.values(OtpPurpose),
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true
    },
    resendAvailableAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// TTL Index to automatically delete expired OTPs from the database
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpVerificationSchema.index({ target: 1, purpose: 1, isVerified: 1 });

export const OtpVerification = mongoose.model('otp_verifications', otpVerificationSchema);
export default OtpVerification;

