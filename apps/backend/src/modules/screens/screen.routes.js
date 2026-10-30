import { Router } from 'express';
import ScreenController from './screen.controller.js';
import SeatCategoryController from './seat-category/seat-category.controller.js';
import SeatingLayoutController from './seating-layout/seating-layout.controller.js';
import SeatController from './seat/seat.controller.js';
import {
  authenticate,
  authorizeRoles,
  authorizePermission
} from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
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
  saveLayoutDraftSchema,
  bulkGenerateSeatsSchema,
  updateSeatSchema,
  updateSeatStatusSchema
} from './screen.validation.js';
import { Roles, Permissions } from '../auth/auth.constants.js';

/* =========================================================================
 * 1. THEATRE OWNER SCREEN & LAYOUT ROUTES (Mounted under /api/v1/owner)
 * ========================================================================= */
export const screenOwnerRoutes = Router();

// All owner screen routes require authentication and THEATRE_OWNER or SUPER_ADMIN role
screenOwnerRoutes.use(authenticate);
screenOwnerRoutes.use(authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN));

// 1.1 Screens Management under Theatre
screenOwnerRoutes.post(
  '/theatres/:theatreId/screens',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramTheatreIdSchema, 'params'),
  validate(createScreenSchema),
  ScreenController.createScreen
);

screenOwnerRoutes.get(
  '/theatres/:theatreId/screens',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramTheatreIdSchema, 'params'),
  validate(screenQuerySchema, 'query'),
  ScreenController.getScreensByTheatre
);

screenOwnerRoutes.get(
  '/screens/:screenId',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenIdSchema, 'params'),
  ScreenController.getScreenById
);

screenOwnerRoutes.patch(
  '/screens/:screenId',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  validate(updateScreenSchema),
  ScreenController.updateScreen
);

screenOwnerRoutes.patch(
  '/screens/:screenId/status',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  validate(updateScreenStatusSchema),
  ScreenController.updateScreenStatus
);

screenOwnerRoutes.delete(
  '/screens/:screenId',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  ScreenController.deleteScreen
);

// 1.2 Seat Categories Management
screenOwnerRoutes.post(
  '/seat-categories',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(createSeatCategorySchema),
  SeatCategoryController.createCategory
);

screenOwnerRoutes.get(
  '/seat-categories',
  authorizePermission(Permissions.THEATRE_READ),
  SeatCategoryController.getPartnerCategories
);

screenOwnerRoutes.get(
  '/seat-categories/:categoryId',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramCategoryIdSchema, 'params'),
  SeatCategoryController.getCategoryById
);

screenOwnerRoutes.patch(
  '/seat-categories/:categoryId',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramCategoryIdSchema, 'params'),
  validate(updateSeatCategorySchema),
  SeatCategoryController.updateCategory
);

screenOwnerRoutes.delete(
  '/seat-categories/:categoryId',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramCategoryIdSchema, 'params'),
  SeatCategoryController.deleteCategory
);

// 1.3 Seating Layout Builder & Engine
screenOwnerRoutes.get(
  '/screens/:screenId/layout',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenIdSchema, 'params'),
  SeatingLayoutController.getLayout
);

screenOwnerRoutes.post(
  '/screens/:screenId/layout',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  validate(saveLayoutDraftSchema),
  SeatingLayoutController.saveLayoutDraft
);

screenOwnerRoutes.post(
  '/screens/:screenId/layout/validate',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  validate(saveLayoutDraftSchema),
  SeatingLayoutController.validateLayout
);

screenOwnerRoutes.post(
  '/screens/:screenId/layout/generate',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  validate(bulkGenerateSeatsSchema),
  SeatingLayoutController.generateBulk
);

screenOwnerRoutes.get(
  '/screens/:screenId/layout/preview',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenIdSchema, 'params'),
  SeatingLayoutController.previewLayout
);

screenOwnerRoutes.post(
  '/screens/:screenId/layout/publish',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramScreenIdSchema, 'params'),
  SeatingLayoutController.publishLayout
);

screenOwnerRoutes.get(
  '/screens/:screenId/layout/versions',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenIdSchema, 'params'),
  SeatingLayoutController.getLayoutVersions
);

screenOwnerRoutes.get(
  '/screens/:screenId/layout/versions/:version',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenAndVersionSchema, 'params'),
  SeatingLayoutController.getLayout
);

// 1.4 Physical Seat Inventory
screenOwnerRoutes.get(
  '/screens/:screenId/seats',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramScreenIdSchema, 'params'),
  SeatController.getSeatsByScreen
);

screenOwnerRoutes.get(
  '/seats/:seatId',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramSeatIdSchema, 'params'),
  SeatController.getSeatById
);

screenOwnerRoutes.patch(
  '/seats/:seatId',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramSeatIdSchema, 'params'),
  validate(updateSeatSchema),
  SeatController.updateSeat
);

screenOwnerRoutes.patch(
  '/seats/:seatId/status',
  authorizePermission(Permissions.SCREEN_MANAGE),
  validate(paramSeatIdSchema, 'params'),
  validate(updateSeatStatusSchema),
  SeatController.updateSeatStatus
);

/* =========================================================================
 * 2. ADMIN SCREEN ROUTES (Mounted under /api/v1/admin/screens)
 * ========================================================================= */
export const screenAdminRoutes = Router();

screenAdminRoutes.use(authenticate);
screenAdminRoutes.use(authorizeRoles(Roles.SYSTEM_ADMIN, Roles.SUPER_ADMIN));

screenAdminRoutes.get('/', validate(screenQuerySchema, 'query'), ScreenController.adminListScreens);

screenAdminRoutes.get(
  '/:screenId',
  validate(paramScreenIdSchema, 'params'),
  ScreenController.adminGetScreenById
);

screenAdminRoutes.patch(
  '/:screenId',
  validate(paramScreenIdSchema, 'params'),
  validate(updateScreenSchema),
  ScreenController.adminUpdateScreen
);

/* =========================================================================
 * 3. PUBLIC SCREEN LAYOUT ROUTES (Mounted under /api/v1/screens)
 * ========================================================================= */
export const screenPublicRoutes = Router();

screenPublicRoutes.get(
  '/:screenId/layout',
  validate(paramScreenIdSchema, 'params'),
  async (req, res, next) => {
    try {
      // In public show flow, return latest published layout
      req.user = { role: Roles.CUSTOMER };
      return SeatingLayoutController.previewLayout(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
);

export default {
  screenOwnerRoutes,
  screenAdminRoutes,
  screenPublicRoutes
};
