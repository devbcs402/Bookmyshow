import mongoose from 'mongoose';
import { PaymentStatus, PaymentGateway } from '../payment.constants.js';

const paymentDetailsSchema = new mongoose.Schema(
  {
    method: { type: String, default: '' },
    vpa: { type: String, default: '' },
    cardNetwork: { type: String, default: '' },
    cardLast4: { type: String, default: '' },
    bankName: { type: String, default: '' },
    wallet: { type: String, default: '' }
  },
  { _id: false }
);

const paymentStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    note: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is mandatory'],
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
      required: [true, 'Theatre Partner ID is mandatory'],
      index: true
    },
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      default: PaymentGateway.RAZORPAY,
      required: true
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay Order ID is mandatory'],
      trim: true,
      unique: true
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true
    },
    razorpaySignature: {
      type: String,
      default: null,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is mandatory'],
      min: [0, 'Payment amount must be non-negative']
    },
    amountInPaise: {
      type: Number,
      required: [true, 'Amount in paise is mandatory'],
      min: [0, 'Amount in paise must be non-negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
      required: true,
      index: true
    },
    paymentMethod: {
      type: String,
      default: '',
      trim: true
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({})
    },
    errorCode: {
      type: String,
      default: '',
      trim: true
    },
    errorDescription: {
      type: String,
      default: '',
      trim: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    capturedAt: {
      type: Date,
      default: null
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true
    },
    reconciliationStatus: {
      type: String,
      enum: ['NORMAL', 'REFUND_REQUIRED', 'INVESTIGATION_REQUIRED'],
      default: 'NORMAL',
      index: true
    },
    statusHistory: {
      type: [paymentStatusHistorySchema],
      default: () => []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
paymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, sparse: true, name: 'uniq_razorpay_payment_id' }
);
paymentSchema.index({ bookingId: 1, status: 1 }, { name: 'idx_booking_status' });
paymentSchema.index({ customerId: 1, createdAt: -1 }, { name: 'idx_customer_created' });
paymentSchema.index({ partnerId: 1, createdAt: -1 }, { name: 'idx_partner_created' });
paymentSchema.index({ idempotencyKey: 1 }, { sparse: true, name: 'idx_payment_idempotency' });

export const PaymentModel =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');

export default PaymentModel;
