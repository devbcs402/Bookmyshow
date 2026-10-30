import { z } from 'zod';
import {
  TheatreStatus,
  TheatreAmenities,
  OperatingDays,
  TheatreSortFields
} from './theatre.constants.js';
import { Roles } from '../auth/auth.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const pincodeRegex = /^\d{6}$/;

const addressSchema = z.object({
  street: z.string().trim().min(3, 'Street must be at least 3 characters').max(300),
  landmark: z.string().trim().max(200).optional().default(''),
  area: z.string().trim().min(2, 'Area must be at least 2 characters').max(100),
  cityId: z.string().regex(objectIdRegex, 'Invalid cityId ObjectId'),
  state: z.string().trim().min(2, 'State must be at least 2 characters').max(100),
  country: z.string().trim().default('India'),
  pincode: z.string().regex(pincodeRegex, 'Pincode must be exactly 6 digits')
});

const locationSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z
    .tuple([
      z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
      z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90')
    ])
    .describe('[longitude, latitude]')
});

const operatingHoursSchema = z.object({
  openingTime: z.string().regex(timeRegex, 'Opening time must be in HH:MM format').default('09:00'),
  closingTime: z.string().regex(timeRegex, 'Closing time must be in HH:MM format').default('23:59'),
  operatingDays: z.array(z.nativeEnum(OperatingDays)).min(1).default(Object.values(OperatingDays))
});

const mediaSchema = z.object({
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  posterUrl: z.string().url('Invalid poster URL').optional().or(z.literal('')),
  exteriorImages: z.array(z.string().url('Invalid exterior image URL')).optional().default([]),
  interiorImages: z.array(z.string().url('Invalid interior image URL')).optional().default([])
});

const businessDetailsSchema = z.object({
  legalName: z.string().trim().max(200).optional().default(''),
  gstin: z.string().trim().max(15).optional().default(''),
  businessRegistrationNumber: z.string().trim().max(50).optional().default('')
});

export const registerTheatreSchema = z.object({
  name: z.string().trim().min(2, 'Theatre name must be at least 2 characters').max(200),
  theatreCode: z.string().trim().max(20).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  contactEmail: z.string().trim().email('Invalid contact email address'),
  contactPhone: z.string().trim().min(8, 'Phone number must be at least 8 digits').max(20),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  address: addressSchema,
  location: locationSchema,
  googleMapsUrl: z.string().url('Invalid Google Maps URL').optional().or(z.literal('')),
  businessDetails: businessDetailsSchema.optional().default({}),
  media: mediaSchema.optional().default({}),
  operatingHours: operatingHoursSchema.optional().default({}),
  amenities: z.array(z.nativeEnum(TheatreAmenities)).optional().default([])
});

export const updateTheatreSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  theatreCode: z.string().trim().max(20).optional(),
  description: z.string().trim().max(2000).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().min(8).max(20).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  address: addressSchema.partial().optional(),
  location: locationSchema.optional(),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  businessDetails: businessDetailsSchema.partial().optional(),
  amenities: z.array(z.nativeEnum(TheatreAmenities)).optional()
});

export const updateTheatreOperationsSchema = z.object({
  operatingHours: operatingHoursSchema,
  amenities: z.array(z.nativeEnum(TheatreAmenities)).optional()
});

export const updateTheatreMediaSchema = mediaSchema;

export const rejectTheatreSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(1000)
});

export const assignStaffSchema = z.object({
  userId: z.string().regex(objectIdRegex, 'Invalid userId ObjectId'),
  role: z.enum([Roles.THEATRE_MANAGER, Roles.THEATRE_STAFF], {
    errorMap: () => ({ message: 'Role must be THEATRE_MANAGER or THEATRE_STAFF' })
  })
});

export const ownerTheatreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.nativeEnum(TheatreStatus).optional(),
  cityId: z.string().regex(objectIdRegex).optional(),
  sortBy: z.nativeEnum(TheatreSortFields).default(TheatreSortFields.CREATED_AT),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const adminTheatreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  partnerId: z.string().regex(objectIdRegex).optional(),
  status: z.nativeEnum(TheatreStatus).optional(),
  cityId: z.string().regex(objectIdRegex).optional(),
  state: z.string().trim().optional(),
  sortBy: z.nativeEnum(TheatreSortFields).default(TheatreSortFields.CREATED_AT),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const publicTheatreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  cityId: z.string().regex(objectIdRegex).optional(),
  citySlug: z.string().trim().optional(),
  area: z.string().trim().optional(),
  pincode: z.string().regex(pincodeRegex).optional(),
  facilities: z.string().trim().optional(), // Comma separated amenities
  longitude: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  radiusKm: z.coerce.number().min(0.5).max(100).default(15).optional(),
  sortBy: z.nativeEnum(TheatreSortFields).default(TheatreSortFields.NAME),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const paramTheatreIdSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatreId ObjectId')
});

export const paramBranchIdSchema = z.object({
  branchId: z.string().regex(objectIdRegex, 'Invalid branchId ObjectId')
});

export const paramStaffSchema = z.object({
  theatreId: z.string().regex(objectIdRegex, 'Invalid theatreId ObjectId'),
  userId: z.string().regex(objectIdRegex, 'Invalid userId ObjectId')
});

export const createCitySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().default('India'),
  isTopCity: z.boolean().default(false),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  pincodes: z.array(z.string().regex(pincodeRegex)).optional().default([])
});

export default {
  registerTheatreSchema,
  updateTheatreSchema,
  updateTheatreOperationsSchema,
  updateTheatreMediaSchema,
  rejectTheatreSchema,
  assignStaffSchema,
  ownerTheatreQuerySchema,
  adminTheatreQuerySchema,
  publicTheatreQuerySchema,
  paramTheatreIdSchema,
  paramBranchIdSchema,
  paramStaffSchema,
  createCitySchema
};
