import { z } from 'zod';
import { RefundReason } from './payment.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createOrderSchema = {
  body: z.object({
    bookingId: z
      .string({ required_error: 'bookingId is required' })
      .regex(objectIdRegex, 'bookingId must be a valid 24-character hexadecimal ObjectId')
  })
};

export const verifyPaymentSchema = {
  body: z.object({
    razorpay_order_id: z
      .string({ required_error: 'razorpay_order_id is required' })
      .min(1, 'razorpay_order_id cannot be empty'),
    razorpay_payment_id: z
      .string({ required_error: 'razorpay_payment_id is required' })
      .min(1, 'razorpay_payment_id cannot be empty'),
    razorpay_signature: z
      .string({ required_error: 'razorpay_signature is required' })
      .min(1, 'razorpay_signature cannot be empty'),
    bookingId: z.string().regex(objectIdRegex, 'bookingId must be a valid ObjectId').optional()
  })
};

export const refundPaymentSchema = {
  params: z.object({
    paymentId: z
      .string({ required_error: 'paymentId is required' })
      .regex(objectIdRegex, 'paymentId must be a valid ObjectId')
  }),
  body: z.object({
    amount: z
      .number({ required_error: 'Refund amount is required' })
      .positive('Refund amount must be greater than zero'),
    reason: z.enum(Object.values(RefundReason)).default(RefundReason.CUSTOMER_REQUESTED),
    deductions: z.number().min(0).default(0)
  })
};

export const getPaymentByIdSchema = {
  params: z.object({
    paymentId: z
      .string({ required_error: 'paymentId is required' })
      .regex(objectIdRegex, 'paymentId must be a valid ObjectId')
  })
};

export const getBookingPaymentsSchema = {
  params: z.object({
    bookingId: z
      .string({ required_error: 'bookingId is required' })
      .regex(objectIdRegex, 'bookingId must be a valid ObjectId')
  })
};
