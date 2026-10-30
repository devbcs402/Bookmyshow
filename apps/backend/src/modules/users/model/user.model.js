import mongoose from 'mongoose';
import { Roles, ApprovalStatus } from '../../auth/auth.constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address format']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+91[6-9]\d{9}$/, 'Invalid Indian mobile number (+91XXXXXXXXXX)']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Exclude from query results by default
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      default: Roles.CUSTOMER,
      required: true
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'theatre_partners',
      default: null
    },
    assignedTheatres: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'theatres'
      }
    ],
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cities',
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    approvalStatus: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.APPROVED
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
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

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ partnerId: 1, role: 1 });
userSchema.index({ isActive: 1, isSuspended: 1, deletedAt: 1 });

export const User = mongoose.model('users', userSchema);
export default User;
