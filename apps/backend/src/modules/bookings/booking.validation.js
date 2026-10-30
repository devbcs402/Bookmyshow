import { z } from 'zod';
import { BookingStatus, BookingDefaults } from './booking.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, 'Must be a valid 24-character hexadecimal MongoDB ObjectId');

export const createBookingValidation = {
  body: z.object({
    showId: objectIdSchema,
    seatIds: z
      .array(objectIdSchema)
      .min(BookingDefaults.MIN_SEATS_PER_BOOKING, 'At least one seat must be selected')
      .max(
        BookingDefaults.MAX_SEATS_PER_BOOKING,
        `Cannot book more than ${BookingDefaults.MAX_SEATS_PER_BOOKING} seats per transaction`
      )
  })
};

export const bookingIdParamValidation = {
  params: z.object({
    bookingId: objectIdSchema
  })
};

export const cancelBookingValidation = {
  params: z.object({
    bookingId: objectIdSchema
  }),
  body: z
    .object({
      reason: z
        .string()
        .trim()
        .max(300, 'Cancellation reason cannot exceed 300 characters')
        .optional()
    })
    .optional()
};

export const customerBookingsQueryValidation = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.nativeEnum(BookingStatus).optional(),
    startDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional()
      ),
    endDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional()
      ),
    sortBy: z.enum(['createdAt', 'netPayableAmount', 'expiresAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

export const partnerBookingsQueryValidation = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    theatreId: objectIdSchema.optional(),
    showId: objectIdSchema.optional(),
    status: z.nativeEnum(BookingStatus).optional(),
    startDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional()
      ),
    endDate: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}/)
          .optional()
      ),
    sortBy: z.enum(['createdAt', 'netPayableAmount', 'expiresAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

export default {
  createBookingValidation,
  bookingIdParamValidation,
  cancelBookingValidation,
  customerBookingsQueryValidation,
  partnerBookingsQueryValidation
};
