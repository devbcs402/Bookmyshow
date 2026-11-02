import mongoose from 'mongoose';
import { RefundStatus, RefundReason } from '../payment.constants.js';

const refundSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is mandatory'],
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is mandatory'],
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is mandatory'],
      index: true
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TheatrePartner',
      default: null,
      index: true
    },
    razorpayRefundId: {
      type: String,
      default: null,
      trim: true
    },
    grossAmount: {
      type: Number,
      required: [true, 'Gross amount is mandatory'],
      min: [0, 'Gross amount must be non-negative']
    },
    deductions: {
      type: Number,
      default: 0.0,
      min: [0, 'Deductions must be non-negative']
    },
    refundAmount: {
      type: Number,
      required: [true, 'Refund amount is mandatory'],
      min: [0, 'Refund amount must be non-negative']
    },
    refundAmountPaise: {
      type: Number,
      required: [true, 'Refund amount in paise is mandatory'],
      min: [0, 'Refund amount in paise must be non-negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    reason: {
      type: String,
      enum: Object.values(RefundReason),
      required: [true, 'Refund reason is mandatory']
    },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      required: true,
      index: true
    },
    failureReason: {
      type: String,
      default: '',
      trim: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    settledAt: {
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
refundSchema.index(
  { razorpayRefundId: 1 },
  { unique: true, sparse: true, name: 'uniq_razorpay_refund_id' }
);
refundSchema.index({ bookingId: 1 }, { name: 'idx_refund_booking' });
refundSchema.index({ status: 1, initiatedAt: 1 }, { name: 'idx_refund_status_initiated' });

export const RefundModel =
  mongoose.models.Refund || mongoose.model('Refund', refundSchema, 'refunds');

export default RefundModel;
