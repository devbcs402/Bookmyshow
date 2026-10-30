import { z } from 'zod';
import { CensorRating, MovieFormat } from '../../movies/movie.constants.js';
import {
  DiscoverySortFields,
  DiscoveryRecommendationTypes
} from '../constants/discovery.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoIdSchema = z
  .string()
  .regex(objectIdRegex, 'Must be a valid 24-character hexadecimal ObjectId');

// 1. Movie Search Query Validation
export const movieSearchQueryValidation = z.object({
  q: z.string().max(100, 'Search query cannot exceed 100 characters').optional(),
  genre: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  cast: z.string().max(100).optional(),
  director: z.string().max(100).optional(),
  certification: z.nativeEnum(CensorRating).optional(),
  cityId: mongoIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z
    .enum(['relevance', 'releaseDate', 'rating', 'title', 'duration', 'createdAt'])
    .default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// 2. Movie Filters Query Validation
export const movieFilterQueryValidation = z.object({
  genre: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional(),
  certification: z.nativeEnum(CensorRating).optional(),
  status: z.enum(['APPROVED', 'UPCOMING', 'NOW_SHOWING']).optional(),
  durationMin: z.coerce.number().int().min(1).max(600).optional(),
  durationMax: z.coerce.number().int().min(1).max(600).optional(),
  releaseDateFrom: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  releaseDateTo: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  cast: z.string().max(100).optional(),
  director: z.string().max(100).optional(),
  format: z.nativeEnum(MovieFormat).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.nativeEnum(DiscoverySortFields).default(DiscoverySortFields.RELEASE_DATE),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// 3. Upcoming Movies Query Validation
export const upcomingQueryValidation = z.object({
  genre: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 4. Now Showing Movies Query Validation
export const nowShowingQueryValidation = z.object({
  cityId: mongoIdSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  genre: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 5. Trending & Popular Query Validation
export const trendingQueryValidation = z.object({
  cityId: mongoIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const popularQueryValidation = z.object({
  cityId: mongoIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 6. Theatre Search Query Validation
export const theatreSearchQueryValidation = z.object({
  q: z.string().max(100).optional(),
  cityId: mongoIdSchema.optional(),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Indian pincode must be exactly 6 digits')
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(15),
  facilities: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 7. Show Search Query Validation
export const showSearchQueryValidation = z.object({
  movieId: mongoIdSchema.optional(),
  theatreId: mongoIdSchema.optional(),
  branchId: mongoIdSchema.optional(),
  cityId: mongoIdSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  language: z.string().max(50).optional(),
  format: z.string().max(20).optional(),
  startTimeFrom: z.string().optional(),
  startTimeTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 8. Recommendations Query Validation
export const recommendationsQueryValidation = z.object({
  type: z.nativeEnum(DiscoveryRecommendationTypes).default(DiscoveryRecommendationTypes.FOR_YOU),
  cityId: mongoIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

// 9. Search Suggestions Query Validation
export const searchSuggestionsQueryValidation = z.object({
  q: z.string().min(1, 'Query parameter q is required').max(50, 'Query cannot exceed 50 characters')
});

// 10. Similar Movie Param Validation
export const similarMovieParamValidation = z.object({
  movieId: mongoIdSchema
});

// 11. Recently Viewed Validations
export const recentlyViewedParamValidation = z.object({
  movieId: mongoIdSchema
});

export const recentlyViewedQueryValidation = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

// 12. Location Discovery Query Validation
export const locationDiscoveryQueryValidation = z.object({
  cityId: mongoIdSchema.optional(),
  city: z.string().max(100).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(15)
});

export default {
  movieSearchQueryValidation,
  movieFilterQueryValidation,
  upcomingQueryValidation,
  nowShowingQueryValidation,
  trendingQueryValidation,
  popularQueryValidation,
  theatreSearchQueryValidation,
  showSearchQueryValidation,
  recommendationsQueryValidation,
  searchSuggestionsQueryValidation,
  similarMovieParamValidation,
  recentlyViewedParamValidation,
  recentlyViewedQueryValidation,
  locationDiscoveryQueryValidation
};
