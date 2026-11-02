import { Router } from 'express';
import AnalyticsController from './analytics.controller.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { Roles } from '../auth/auth.constants.js';
import { analyticsQuerySchema } from './analytics.validation.js';

export const theatreOwnerAnalyticsRoutes = Router();

// Strictly guard theatre owner analytics routes to THEATRE_OWNER role
theatreOwnerAnalyticsRoutes.use(
  authenticate,
  authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN)
);

/**
 * @openapi
 * /theatre-owner/analytics/overview:
 *   get:
 *     summary: Retrieve isolated performance overview for authenticated theatre partner
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Isolated partner performance overview
 *       403:
 *         description: Forbidden
 */
theatreOwnerAnalyticsRoutes.get(
  '/overview',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getOwnerOverview
);

/**
 * @openapi
 * /theatre-owner/analytics/bookings:
 *   get:
 *     summary: Retrieve isolated booking statistics and daily trends for authenticated partner
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Partner booking metrics
 */
theatreOwnerAnalyticsRoutes.get(
  '/bookings',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getOwnerBookings
);

/**
 * @openapi
 * /theatre-owner/analytics/revenue:
 *   get:
 *     summary: Retrieve net settlement breakdown for authenticated partner
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Partner revenue and settlement metrics
 */
theatreOwnerAnalyticsRoutes.get(
  '/revenue',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getOwnerRevenue
);

export default theatreOwnerAnalyticsRoutes;

