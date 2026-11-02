import mongoose from 'mongoose';

const theatrePartnerSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200
    },
    businessEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    businessPhone: {
      type: String,
      required: true,
      trim: true
    },
    businessAddress: {
      type: String,
      required: true,
      trim: true
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    pan: {
      type: String,
      trim: true,
      default: ''
    },
    kycStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
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

theatrePartnerSchema.index({ ownerUserId: 1 }, { unique: true });
theatrePartnerSchema.index({ kycStatus: 1, isActive: 1 });

export const TheatrePartner = mongoose.model('theatre_partners', theatrePartnerSchema);
export default TheatrePartner;
