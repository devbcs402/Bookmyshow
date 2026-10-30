import { Router } from 'express';
import ShowController from './show.controller.js';
import ShowPricingController from './show-pricing/show-pricing.controller.js';
import DiscoveryController from '../discovery/controllers/discovery.controller.js';
import {
  authenticate,
  authorizeRoles,
  authorizePermission
} from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  paramShowIdSchema,
  paramMovieIdSchema,
  paramTheatreIdSchema,
  createShowSchema,
  updateShowSchema,
  rescheduleShowSchema,
  cancelShowSchema,
  showQuerySchema,
  publicShowQuerySchema
} from './show.validation.js';
import {
  paramShowIdAndCategorySchema,
  setPricingSchema,
  updatePricingCategorySchema
} from './show-pricing/show-pricing.validation.js';
import { showSearchQueryValidation } from '../discovery/validators/discovery.validation.js';
import { Roles, Permissions } from '../auth/auth.constants.js';

/* =========================================================================
 * 1. THEATRE OWNER SHOW ROUTES (Mounted under /api/v1/owner/shows)
 * ========================================================================= */
export const showOwnerRoutes = Router();

showOwnerRoutes.use(authenticate);
showOwnerRoutes.use(authorizeRoles(Roles.THEATRE_OWNER, Roles.THEATRE_MANAGER, Roles.SUPER_ADMIN));

// 1.1 Show Management & Scheduling
showOwnerRoutes.post(
  '/',
  authorizePermission(Permissions.SHOW_CREATE),
  validate(createShowSchema),
  ShowController.createShow
);

showOwnerRoutes.get(
  '/',
  authorizePermission(Permissions.SHOW_READ),
  validate(showQuerySchema, 'query'),
  ShowController.getOwnerShows
);

showOwnerRoutes.get(
  '/:showId',
  authorizePermission(Permissions.SHOW_READ),
  validate(paramShowIdSchema, 'params'),
  ShowController.getShowById
);

showOwnerRoutes.patch(
  '/:showId',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdSchema, 'params'),
  validate(updateShowSchema),
  ShowController.updateShow
);

showOwnerRoutes.patch(
  '/:showId/reschedule',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdSchema, 'params'),
  validate(rescheduleShowSchema),
  ShowController.rescheduleShow
);

showOwnerRoutes.post(
  '/:showId/publish',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdSchema, 'params'),
  ShowController.publishShow
);

showOwnerRoutes.post(
  '/:showId/cancel',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdSchema, 'params'),
  validate(cancelShowSchema),
  ShowController.cancelShow
);

// 1.2 Show Pricing Management
showOwnerRoutes.put(
  '/:showId/pricing',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdSchema, 'params'),
  validate(setPricingSchema),
  ShowPricingController.setShowPricing
);

showOwnerRoutes.get(
  '/:showId/pricing',
  authorizePermission(Permissions.SHOW_READ),
  validate(paramShowIdSchema, 'params'),
  ShowPricingController.getShowPricing
);

showOwnerRoutes.patch(
  '/:showId/pricing/:categoryCode',
  authorizePermission(Permissions.SHOW_UPDATE),
  validate(paramShowIdAndCategorySchema, 'params'),
  validate(updatePricingCategorySchema),
  ShowPricingController.updateCategoryPrice
);

/* =========================================================================
 * 2. PUBLIC SHOW ROUTES (Mounted under /api/v1/shows)
 * ========================================================================= */
export const showPublicRoutes = Router();

showPublicRoutes.get(
  '/search',
  validate(showSearchQueryValidation, 'query'),
  DiscoveryController.searchShows
);

showPublicRoutes.get(
  '/',
  validate(publicShowQuerySchema, 'query'),
  ShowController.searchPublicShows
);

showPublicRoutes.get(
  '/:showId',
  validate(paramShowIdSchema, 'params'),
  ShowController.getPublicShowDetails
);

/* =========================================================================
 * 3. PUBLIC SUB-ROUTES FOR MOVIES & THEATRES
 * ========================================================================= */
export const movieShowsPublicRoutes = Router({ mergeParams: true });
movieShowsPublicRoutes.get(
  '/:movieId/shows',
  validate(paramMovieIdSchema, 'params'),
  validate(publicShowQuerySchema, 'query'),
  ShowController.getMovieShows
);

export const theatreShowsPublicRoutes = Router({ mergeParams: true });
theatreShowsPublicRoutes.get(
  '/:theatreId/shows',
  validate(paramTheatreIdSchema, 'params'),
  validate(publicShowQuerySchema, 'query'),
  ShowController.getTheatreShows
);

export default {
  showOwnerRoutes,
  showPublicRoutes,
  movieShowsPublicRoutes,
  theatreShowsPublicRoutes
};
