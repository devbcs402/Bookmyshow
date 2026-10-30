import { Router } from 'express';
import AnalyticsController from './analytics.controller.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { Roles } from '../auth/auth.constants.js';
import { analyticsQuerySchema } from './analytics.validation.js';

export const adminAnalyticsRoutes = Router();

// Strictly guard admin analytics routes to SUPER_ADMIN and ADMIN roles
adminAnalyticsRoutes.use(authenticate, authorizeRoles(Roles.SUPER_ADMIN, Roles.ADMIN));

/**
 * @openapi
 * /admin/analytics/overview:
 *   get:
 *     summary: Retrieve comprehensive platform KPI overview
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, 7d, 30d, this_month, prev_month, custom]
 *           default: 7d
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Overview platform metrics
 */
adminAnalyticsRoutes.get(
  '/overview',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getAdminOverview
);

/**
 * @openapi
 * /admin/analytics/bookings:
 *   get:
 *     summary: Retrieve platform booking status breakdown and trends
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Booking trends and status distribution
 */
adminAnalyticsRoutes.get(
  '/bookings',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getAdminBookings
);

/**
 * @openapi
 * /admin/analytics/revenue:
 *   get:
 *     summary: Retrieve financial revenue breakdown (gross, captured, refunded, commission)
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Financial revenue accounting metrics
 */
adminAnalyticsRoutes.get(
  '/revenue',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getAdminRevenue
);

/**
 * @openapi
 * /admin/analytics/movies:
 *   get:
 *     summary: Retrieve top performing movies by ticket sales and revenue
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ranked movie performance metrics
 */
adminAnalyticsRoutes.get(
  '/movies',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getAdminMovies
);

/**
 * @openapi
 * /admin/analytics/theatres:
 *   get:
 *     summary: Retrieve top performing theatres by revenue and bookings
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ranked theatre performance metrics
 */
adminAnalyticsRoutes.get(
  '/theatres',
  validate(analyticsQuerySchema, 'query'),
  AnalyticsController.getAdminTheatres
);

export default adminAnalyticsRoutes;

