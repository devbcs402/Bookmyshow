import mongoose from 'mongoose';

const paymentWebhookSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'Webhook event ID is mandatory'],
      unique: true,
      trim: true
    },
    eventType: {
      type: String,
      required: [true, 'Webhook event type is mandatory'],
      trim: true,
      index: true
    },
    signature: {
      type: String,
      required: [true, 'Webhook signature is mandatory'],
      trim: true
    },
    isSignatureValid: {
      type: Boolean,
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    processed: {
      type: Boolean,
      default: false,
      index: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    errorLog: {
      type: String,
      default: '',
      trim: true
    },
    idempotentReplay: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
paymentWebhookSchema.index({ processed: 1, createdAt: 1 }, { name: 'idx_webhook_processing' });
// 90-day TTL index for automatic retention hygiene
paymentWebhookSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000, name: 'ttl_webhook_retention' }
);

export const PaymentWebhookModel =
  mongoose.models.PaymentWebhook ||
  mongoose.model('PaymentWebhook', paymentWebhookSchema, 'payment_webhooks');

export default PaymentWebhookModel;

