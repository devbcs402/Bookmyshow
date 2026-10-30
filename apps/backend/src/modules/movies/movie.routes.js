import { Router } from 'express';
import MovieController from './movie.controller.js';
import DiscoveryController from '../discovery/controllers/discovery.controller.js';
import { authenticate, authorizePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createMovieValidation,
  updateMovieValidation,
  adminMovieQueryValidation,
  publicMovieQueryValidation,
  movieIdParamValidation,
  movieSlugParamValidation,
  rejectMovieValidation
} from './movie.validation.js';
import {
  movieSearchQueryValidation,
  nowShowingQueryValidation,
  trendingQueryValidation,
  popularQueryValidation,
  similarMovieParamValidation
} from '../discovery/validators/discovery.validation.js';
import { Permissions } from '../auth/auth.constants.js';

// Public Movie Routes mounted at /api/v1/movies
export const moviePublicRoutes = Router();

// Search, Discovery, and Filter endpoints (declared before /:slug)
moviePublicRoutes.get(
  '/search',
  validate(movieSearchQueryValidation, 'query'),
  DiscoveryController.searchMovies
);
moviePublicRoutes.get(
  '/trending',
  validate(trendingQueryValidation, 'query'),
  DiscoveryController.getTrendingMovies
);
moviePublicRoutes.get(
  '/popular',
  validate(popularQueryValidation, 'query'),
  DiscoveryController.getPopularMovies
);
moviePublicRoutes.get('/', validate(publicMovieQueryValidation), MovieController.getPublicMovies);
moviePublicRoutes.get(
  '/upcoming',
  validate(publicMovieQueryValidation),
  MovieController.getUpcomingMovies
);
moviePublicRoutes.get(
  '/now-showing',
  validate(nowShowingQueryValidation, 'query'),
  DiscoveryController.getNowShowingMovies
);
moviePublicRoutes.get(
  '/:movieId/similar',
  validate(similarMovieParamValidation, 'params'),
  DiscoveryController.getSimilarMovies
);
moviePublicRoutes.get('/:slug', validate(movieSlugParamValidation), MovieController.getMovieBySlug);

// Admin Movie Routes mounted at /api/v1/admin/movies
export const movieAdminRoutes = Router();

// All admin movie routes require authentication
movieAdminRoutes.use(authenticate);

movieAdminRoutes.post(
  '/',
  authorizePermission(Permissions.MOVIE_CREATE),
  validate(createMovieValidation),
  MovieController.createMovie
);

movieAdminRoutes.get(
  '/',
  authorizePermission(Permissions.MOVIE_READ),
  validate(adminMovieQueryValidation),
  MovieController.getAdminMovies
);

movieAdminRoutes.get(
  '/:movieId',
  authorizePermission(Permissions.MOVIE_READ),
  validate(movieIdParamValidation),
  MovieController.getAdminMovieById
);

movieAdminRoutes.patch(
  '/:movieId',
  authorizePermission(Permissions.MOVIE_UPDATE),
  validate(updateMovieValidation),
  MovieController.updateMovie
);

movieAdminRoutes.delete(
  '/:movieId',
  authorizePermission(Permissions.MOVIE_DELETE),
  validate(movieIdParamValidation),
  MovieController.deleteMovie
);

movieAdminRoutes.patch(
  '/:movieId/approve',
  authorizePermission(Permissions.MOVIE_UPDATE),
  validate(movieIdParamValidation),
  MovieController.approveMovie
);

movieAdminRoutes.patch(
  '/:movieId/reject',
  authorizePermission(Permissions.MOVIE_UPDATE),
  validate(rejectMovieValidation),
  MovieController.rejectMovie
);

export default {
  moviePublicRoutes,
  movieAdminRoutes
};
