import { z } from 'zod';
import { SeatLockDefaults } from './seat-lock.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const showIdParamValidation = {
  params: z.object({
    showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
  })
};

export const acquireSeatLocksValidation = {
  params: z.object({
    showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
  }),
  body: z.object({
    seatIds: z
      .array(z.string().regex(objectIdRegex, 'Invalid seat ID ObjectId'))
      .min(1, 'At least one seat must be selected')
      .max(
        SeatLockDefaults.MAX_SEATS_PER_REQUEST,
        `Cannot lock more than ${SeatLockDefaults.MAX_SEATS_PER_REQUEST} seats per transaction`
      )
      .refine(items => new Set(items).size === items.length, {
        message: 'Duplicate seat IDs in selection are not permitted'
      }),
    idempotencyKey: z
      .string()
      .trim()
      .min(1, 'Idempotency key must not be empty')
      .max(128, 'Idempotency key cannot exceed 128 characters')
      .optional()
  })
};

export const releaseSeatLocksValidation = {
  params: z.object({
    showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
  }),
  body: z.object({
    seatIds: z
      .array(z.string().regex(objectIdRegex, 'Invalid seat ID ObjectId'))
      .min(1, 'At least one seat must be specified for release')
      .max(
        SeatLockDefaults.MAX_SEATS_PER_REQUEST,
        `Cannot release more than ${SeatLockDefaults.MAX_SEATS_PER_REQUEST} seats in one request`
      )
      .refine(items => new Set(items).size === items.length, {
        message: 'Duplicate seat IDs in selection are not permitted'
      }),
    lockId: z
      .string()
      .trim()
      .min(1, 'Lock identifier is required for release')
      .max(64, 'Lock identifier must be valid')
  })
};

export const renewSeatLocksValidation = {
  params: z.object({
    showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
  }),
  body: z.object({
    seatIds: z
      .array(z.string().regex(objectIdRegex, 'Invalid seat ID ObjectId'))
      .min(1, 'At least one seat must be specified for renewal')
      .max(
        SeatLockDefaults.MAX_SEATS_PER_REQUEST,
        `Cannot renew more than ${SeatLockDefaults.MAX_SEATS_PER_REQUEST} seats in one request`
      )
      .refine(items => new Set(items).size === items.length, {
        message: 'Duplicate seat IDs in selection are not permitted'
      }),
    lockId: z
      .string()
      .trim()
      .min(1, 'Lock identifier is required for renewal')
      .max(64, 'Lock identifier must be valid')
  })
};

// Aliases for backward/direct schema compatibility
export const paramShowIdSchema = showIdParamValidation.params;
export const acquireSeatLocksSchema = acquireSeatLocksValidation.body;
export const releaseSeatLocksSchema = releaseSeatLocksValidation.body;
export const renewSeatLocksSchema = renewSeatLocksValidation.body;

export default {
  showIdParamValidation,
  acquireSeatLocksValidation,
  releaseSeatLocksValidation,
  renewSeatLocksValidation,
  paramShowIdSchema,
  acquireSeatLocksSchema,
  releaseSeatLocksSchema,
  renewSeatLocksSchema
};
