import { z } from 'zod';
import {
  MovieStatus,
  PublicVisibleStatuses,
  CensorRating,
  MovieFormat,
  MovieSortFields
} from './movie.constants.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createMovieValidation = {
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters'),
    originalTitle: z.string().trim().max(200).optional(),
    slug: z
      .string()
      .trim()
      .regex(SLUG_REGEX, 'Invalid slug format (lowercase hyphenated)')
      .optional(),
    synopsis: z
      .string()
      .trim()
      .min(10, 'Synopsis must be at least 10 characters')
      .max(5000, 'Synopsis cannot exceed 5000 characters'),
    shortDescription: z.string().trim().max(300).optional(),
    durationMins: z
      .number()
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(600, 'Duration cannot exceed 600 minutes'),
    releaseDate: z
      .string()
      .datetime({ message: 'Release date must be a valid ISO-8601 date string' }),
    endDate: z.string().datetime().optional().nullable(),
    censorRating: z.enum(Object.values(CensorRating)),
    productionCountry: z.string().trim().default('India').optional(),
    originalLanguageId: z
      .string()
      .regex(OBJECT_ID_REGEX, 'Invalid originalLanguageId ObjectId')
      .optional()
      .nullable(),
    genreIds: z
      .array(z.string().regex(OBJECT_ID_REGEX, 'Each genreId must be a valid ObjectId'))
      .min(1, 'At least one genre is required'),
    languageIds: z
      .array(z.string().regex(OBJECT_ID_REGEX, 'Each languageId must be a valid ObjectId'))
      .min(1, 'At least one language is required'),
    availableFormats: z
      .array(z.enum(Object.values(MovieFormat)))
      .default([MovieFormat.TWO_D])
      .optional(),
    cast: z
      .array(
        z.object({
          actorId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
          name: z.string().trim().min(1, 'Cast member name is required'),
          role: z.string().trim().default('ACTOR').optional(),
          character: z.string().trim().default('').optional(),
          photoUrl: z.string().trim().default('').optional()
        })
      )
      .default([])
      .optional(),
    crew: z
      .array(
        z.object({
          crewId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
          name: z.string().trim().min(1, 'Crew member name is required'),
          role: z.string().trim().min(1, 'Crew member role is required'),
          designation: z.string().trim().default('').optional(),
          photoUrl: z.string().trim().default('').optional()
        })
      )
      .default([])
      .optional(),
    posterUrl: z.string().trim().url('Poster URL must be a valid URL'),
    bannerUrl: z.string().trim().url().or(z.literal('')).default('').optional(),
    backdropUrl: z.string().trim().url().or(z.literal('')).default('').optional(),
    trailerUrl: z.string().trim().url().or(z.literal('')).default('').optional(),
    galleryImages: z.array(z.string().trim().url()).default([]).optional(),
    status: z.enum(Object.values(MovieStatus)).default(MovieStatus.DRAFT).optional()
  })
};

export const updateMovieValidation = {
  params: z.object({
    movieId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for movieId')
  }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    originalTitle: z.string().trim().max(200).optional().nullable(),
    slug: z.string().trim().regex(SLUG_REGEX).optional(),
    synopsis: z.string().trim().min(10).max(5000).optional(),
    shortDescription: z.string().trim().max(300).optional().nullable(),
    durationMins: z.number().int().min(1).max(600).optional(),
    releaseDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional().nullable(),
    censorRating: z.enum(Object.values(CensorRating)).optional(),
    productionCountry: z.string().trim().optional(),
    originalLanguageId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
    genreIds: z.array(z.string().regex(OBJECT_ID_REGEX)).min(1).optional(),
    languageIds: z.array(z.string().regex(OBJECT_ID_REGEX)).min(1).optional(),
    availableFormats: z.array(z.enum(Object.values(MovieFormat))).optional(),
    cast: z
      .array(
        z.object({
          actorId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
          name: z.string().trim().min(1),
          role: z.string().trim().optional(),
          character: z.string().trim().optional(),
          photoUrl: z.string().trim().optional()
        })
      )
      .optional(),
    crew: z
      .array(
        z.object({
          crewId: z.string().regex(OBJECT_ID_REGEX).optional().nullable(),
          name: z.string().trim().min(1),
          role: z.string().trim().min(1),
          designation: z.string().trim().optional(),
          photoUrl: z.string().trim().optional()
        })
      )
      .optional(),
    posterUrl: z.string().trim().url().optional(),
    bannerUrl: z.string().trim().url().or(z.literal('')).optional(),
    backdropUrl: z.string().trim().url().or(z.literal('')).optional(),
    trailerUrl: z.string().trim().url().or(z.literal('')).optional(),
    galleryImages: z.array(z.string().trim().url()).optional(),
    status: z.enum(Object.values(MovieStatus)).optional(),
    rejectionReason: z.string().trim().optional()
  })
};

export const adminMovieQueryValidation = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(Object.values(MovieStatus)).optional(),
    genre: z.string().trim().optional(),
    language: z.string().trim().optional(),
    certification: z.enum(Object.values(CensorRating)).optional(),
    releaseDateFrom: z.string().datetime().optional(),
    releaseDateTo: z.string().datetime().optional(),
    sortBy: z.enum(Object.values(MovieSortFields)).default(MovieSortFields.CREATED_AT),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

export const publicMovieQueryValidation = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().optional(),
    status: z.enum(PublicVisibleStatuses).optional(),
    genre: z.string().trim().optional(),
    language: z.string().trim().optional(),
    releaseYear: z.coerce.number().int().min(1900).max(2100).optional(),
    durationMin: z.coerce.number().int().min(1).max(600).optional(),
    durationMax: z.coerce.number().int().min(1).max(600).optional(),
    cast: z.string().trim().optional(),
    director: z.string().trim().optional(),
    certification: z.enum(Object.values(CensorRating)).optional(),
    format: z.enum(Object.values(MovieFormat)).optional(),
    releaseDateFrom: z.string().datetime().optional(),
    releaseDateTo: z.string().datetime().optional(),
    sortBy: z
      .enum([MovieSortFields.RELEASE_DATE, MovieSortFields.RATING, MovieSortFields.TITLE])
      .default(MovieSortFields.RELEASE_DATE),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

export const movieIdParamValidation = {
  params: z.object({
    movieId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for movieId')
  })
};

export const movieSlugParamValidation = {
  params: z.object({
    slug: z.string().trim().regex(SLUG_REGEX, 'Invalid movie slug parameter format')
  })
};

export const rejectMovieValidation = {
  params: z.object({
    movieId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for movieId')
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').max(500)
  })
};

// Genre Validation
export const createGenreValidation = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
    slug: z.string().trim().regex(SLUG_REGEX, 'Invalid slug format').optional(),
    description: z.string().trim().max(300).default('').optional()
  })
};

export const updateGenreValidation = {
  params: z.object({
    genreId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for genreId')
  }),
  body: z.object({
    name: z.string().trim().min(2).max(50).optional(),
    description: z.string().trim().max(300).optional(),
    isActive: z.boolean().optional()
  })
};

export const genreIdParamValidation = {
  params: z.object({
    genreId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for genreId')
  })
};

// Language Validation
export const createLanguageValidation = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
    code: z.string().trim().min(2, 'Code must be 2 or 3 characters').max(3),
    nativeName: z.string().trim().max(50).default('').optional()
  })
};

export const updateLanguageValidation = {
  params: z.object({
    languageId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for languageId')
  }),
  body: z.object({
    name: z.string().trim().min(2).max(50).optional(),
    nativeName: z.string().trim().max(50).optional(),
    isActive: z.boolean().optional()
  })
};

export const languageIdParamValidation = {
  params: z.object({
    languageId: z.string().regex(OBJECT_ID_REGEX, 'Invalid MongoDB ObjectId for languageId')
  })
};

export default {
  createMovieValidation,
  updateMovieValidation,
  adminMovieQueryValidation,
  publicMovieQueryValidation,
  movieIdParamValidation,
  movieSlugParamValidation,
  rejectMovieValidation,
  createGenreValidation,
  updateGenreValidation,
  genreIdParamValidation,
  createLanguageValidation,
  updateLanguageValidation,
  languageIdParamValidation
};
