import { z } from 'zod';
import {
  ScreenType,
  ScreenStatus,
  SeatType,
  SeatStatus,
  ScreenSortFields
} from './screen.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const paramScreenIdSchema = z.object({
  screenId: z.string().regex(objectIdRegex, 'Invalid screen ID ObjectId')
});

export const paramTheatreIdSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatre ID ObjectId')
});

export const paramCategoryIdSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, 'Invalid seat category ID ObjectId')
});

export const paramSeatIdSchema = z.object({
  seatId: z.string().regex(objectIdRegex, 'Invalid seat ID ObjectId')
});

export const paramScreenAndVersionSchema = z.object({
  screenId: z.string().regex(objectIdRegex, 'Invalid screen ID ObjectId'),
  version: z.string().optional()
});

export const createScreenSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatre ID ObjectId').optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Screen name must be at least 1 character')
    .max(100, 'Screen name cannot exceed 100 characters'),
  screenNumber: z.number().int().min(1, 'Screen number must be an integer >= 1'),
  screenType: z.nativeEnum(ScreenType).default(ScreenType.STANDARD),
  supportedFormats: z
    .array(z.enum(['2D', '3D', 'IMAX_2D', 'IMAX_3D', '4DX']))
    .optional()
    .default(['2D']),
  soundSystem: z.string().trim().max(100).optional().default('Dolby 7.1'),
  description: z.string().trim().max(1000).optional().default('')
});

export const updateScreenSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  screenNumber: z.number().int().min(1).optional(),
  screenType: z.nativeEnum(ScreenType).optional(),
  supportedFormats: z.array(z.enum(['2D', '3D', 'IMAX_2D', 'IMAX_3D', '4DX'])).optional(),
  soundSystem: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional()
});

export const updateScreenStatusSchema = z.object({
  status: z.nativeEnum(ScreenStatus)
});

export const screenQuerySchema = z.object({
  theatreId: z.string().regex(objectIdRegex).optional(),
  status: z.nativeEnum(ScreenStatus).optional(),
  screenType: z.nativeEnum(ScreenType).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(ScreenSortFields).default(ScreenSortFields.SCREEN_NUMBER),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const createSeatCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_]{2,30}$/,
      'Code must be 2-30 uppercase alphanumeric characters or underscores'
    ),
  description: z.string().trim().max(500).optional().default(''),
  displayColor: z.string().regex(hexColorRegex, 'Invalid hex color format').default('#3B82F6'),
  basePrice: z.number().min(0, 'Base price cannot be negative').default(200),
  sortOrder: z.number().int().min(1).default(1)
});

export const updateSeatCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  displayColor: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  basePrice: z.number().min(0).optional(),
  sortOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export const layoutSeatSchema = z.object({
  rowLabel: z.string().trim().min(1).max(4),
  columnNumber: z.number().int().min(1),
  seatLabel: z.string().trim().min(1).max(10),
  categoryCode: z.string().trim().min(1).max(30).default('REGULAR'),
  type: z.nativeEnum(SeatType).default(SeatType.NORMAL),
  status: z.nativeEnum(SeatStatus).default(SeatStatus.ACTIVE),
  gridRow: z.number().int().min(0),
  gridCol: z.number().int().min(0),
  isAvailable: z.boolean().default(true),
  accessibility: z
    .object({
      isWheelchairAccessible: z.boolean().optional().default(false),
      hasCompanionSeat: z.boolean().optional().default(false),
      hasHearingLoop: z.boolean().optional().default(false)
    })
    .optional()
    .default({})
});

export const saveLayoutDraftSchema = z.object({
  name: z.string().trim().max(100).optional(),
  seats: z.array(layoutSeatSchema).min(1, 'Layout must contain at least one seat')
});

export const bulkGenerateSeatsSchema = z.object({
  rows: z
    .array(
      z.object({
        rowLabel: z.string().trim().min(1).max(4).optional(),
        seatCount: z.number().int().min(1).max(100),
        categoryCode: z.string().trim().optional().default('REGULAR'),
        seatType: z.nativeEnum(SeatType).optional().default(SeatType.NORMAL),
        aislesAfter: z.array(z.number().int().min(1)).optional().default([]),
        skipColumns: z.array(z.number().int().min(1)).optional().default([])
      })
    )
    .min(1, 'At least one row definition is required to generate seats')
});

export const updateSeatSchema = z.object({
  categoryCode: z.string().trim().min(1).max(30).optional(),
  type: z.nativeEnum(SeatType).optional(),
  status: z.nativeEnum(SeatStatus).optional(),
  isAvailable: z.boolean().optional(),
  accessibility: z
    .object({
      isWheelchairAccessible: z.boolean().optional(),
      hasCompanionSeat: z.boolean().optional(),
      hasHearingLoop: z.boolean().optional()
    })
    .optional()
});

export const updateSeatStatusSchema = z.object({
  status: z.nativeEnum(SeatStatus),
  isAvailable: z.boolean().optional()
});

export default {
  paramScreenIdSchema,
  paramTheatreIdSchema,
  paramCategoryIdSchema,
  paramSeatIdSchema,
  paramScreenAndVersionSchema,
  createScreenSchema,
  updateScreenSchema,
  updateScreenStatusSchema,
  screenQuerySchema,
  createSeatCategorySchema,
  updateSeatCategorySchema,
  layoutSeatSchema,
  saveLayoutDraftSchema,
  bulkGenerateSeatsSchema,
  updateSeatSchema,
  updateSeatStatusSchema
};
