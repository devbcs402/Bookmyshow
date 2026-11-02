import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const paramShowIdSchema = z.object({
  showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId')
});

export const paramShowIdAndCategorySchema = z.object({
  showId: z.string().regex(objectIdRegex, 'Invalid show ID ObjectId'),
  categoryCode: z.string().trim().min(1).max(30)
});

export const pricingTierItemSchema = z.object({
  categoryCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Category code must be at least 2 characters')
    .max(30),
  categoryName: z.string().trim().max(100).optional(),
  basePrice: z.number().min(0, 'Base price cannot be negative'),
  convenienceFee: z.number().min(0, 'Convenience fee cannot be negative').optional().default(0),
  taxPercent: z.number().min(0, 'Tax percent cannot be negative').optional().default(18.0),
  currency: z.string().trim().max(10).optional().default('INR')
});

export const setPricingSchema = z.object({
  pricingTiers: z.array(pricingTierItemSchema).min(1, 'At least one pricing tier must be defined')
});

export const updatePricingCategorySchema = z.object({
  categoryName: z.string().trim().max(100).optional(),
  basePrice: z.number().min(0).optional(),
  convenienceFee: z.number().min(0).optional(),
  taxPercent: z.number().min(0).optional()
});

export default {
  paramShowIdSchema,
  paramShowIdAndCategorySchema,
  pricingTierItemSchema,
  setPricingSchema,
  updatePricingCategorySchema
};
