import { z } from 'zod';
import { ShowStatus, ShowFormat, ShowType, ShowSortFields } from './show.constants.js';
import { pricingTierItemSchema } from './show-pricing/show-pricing.validation.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const paramShowIdSchema = z.object({
  showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
});

export const paramMovieIdSchema = z.object({
  movieId: z.string().regex(objectIdRegex, 'Invalid movie ID ObjectId')
});

export const paramTheatreIdSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatre ID ObjectId')
});

export const createShowSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatre ID ObjectId'),
  branchId: z.string().regex(objectIdRegex, 'Invalid branch ID ObjectId').optional(),
  screenId: z.string().regex(objectIdRegex, 'Invalid screen ID ObjectId'),
  movieId: z.string().regex(objectIdRegex, 'Invalid movie ID ObjectId'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO 8601 UTC timestamp' }),
  durationMins: z.number().int().min(1, 'Duration must be at least 1 minute').optional(),
  cleanupBufferMinutes: z.number().int().min(0).max(120).optional().default(20),
  timezone: z.string().trim().max(100).optional().default('Asia/Kolkata'),
  format: z.nativeEnum(ShowFormat).optional().default(ShowFormat.TWO_D),
  language: z.string().trim().min(1).max(50).optional(),
  subtitleLanguage: z.string().trim().max(50).optional().default('None'),
  audioFormat: z.string().trim().max(50).optional().default('Dolby 7.1'),
  showType: z.nativeEnum(ShowType).optional().default(ShowType.REGULAR),
  pricingTiers: z.array(pricingTierItemSchema).optional().default([])
});

export const updateShowSchema = z.object({
  format: z.nativeEnum(ShowFormat).optional(),
  language: z.string().trim().min(1).max(50).optional(),
  subtitleLanguage: z.string().trim().max(50).optional(),
  audioFormat: z.string().trim().max(50).optional(),
  showType: z.nativeEnum(ShowType).optional(),
  bookingOpensAt: z.string().datetime().optional(),
  bookingClosesAt: z.string().datetime().optional()
});

export const rescheduleShowSchema = z.object({
  newStartTime: z
    .string()
    .datetime({ message: 'New start time must be a valid ISO 8601 UTC timestamp' }),
  reason: z.string().trim().max(500).optional().default('Operational adjustment')
});

export const cancelShowSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500)
});

export const showQuerySchema = z.object({
  theatreId: z.string().regex(objectIdRegex).optional(),
  screenId: z.string().regex(objectIdRegex).optional(),
  movieId: z.string().regex(objectIdRegex).optional(),
  cityId: z.string().regex(objectIdRegex).optional(),
  status: z.nativeEnum(ShowStatus).optional(),
  date: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(ShowSortFields).default(ShowSortFields.START_TIME),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const publicShowQuerySchema = z.object({
  cityId: z.string().regex(objectIdRegex).optional(),
  movieId: z.string().regex(objectIdRegex).optional(),
  theatreId: z.string().regex(objectIdRegex).optional(),
  date: z.string().optional(),
  format: z.nativeEnum(ShowFormat).optional(),
  language: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(ShowSortFields).default(ShowSortFields.START_TIME),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export default {
  paramShowIdSchema,
  paramMovieIdSchema,
  paramTheatreIdSchema,
  createShowSchema,
  updateShowSchema,
  rescheduleShowSchema,
  cancelShowSchema,
  showQuerySchema,
  publicShowQuerySchema
};
