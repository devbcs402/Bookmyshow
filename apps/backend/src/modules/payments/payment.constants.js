export const PaymentStatus = Object.freeze({
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED'
});

export const RefundStatus = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
});

export const RefundReason = Object.freeze({
  CUSTOMER_REQUESTED: 'CUSTOMER_REQUESTED',
  SHOW_CANCELLED: 'SHOW_CANCELLED',
  DOUBLE_BOOKING_FAILSAFE: 'DOUBLE_BOOKING_FAILSAFE',
  OVERPAYMENT: 'OVERPAYMENT',
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE'
});

export const PaymentGateway = Object.freeze({
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE'
});

export const WebhookEvents = Object.freeze({
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  ORDER_PAID: 'order.paid',
  REFUND_CREATED: 'refund.created',
  REFUND_PROCESSED: 'refund.processed',
  REFUND_FAILED: 'refund.failed'
});

export const PaymentDefaults = Object.freeze({
  CURRENCY: 'INR',
  DEFAULT_ORDER_EXPIRY_MINUTES: 15,
  MAX_REFUND_RETRY_ATTEMPTS: 3
});
