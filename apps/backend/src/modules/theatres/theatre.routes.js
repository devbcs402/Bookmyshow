import { Router } from 'express';
import TheatreController from './theatre.controller.js';
import {
  authenticate,
  authorizeRoles,
  authorizePermission
} from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
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
  paramStaffSchema,
  createCitySchema
} from './theatre.validation.js';
import { Roles, Permissions } from '../auth/auth.constants.js';

/* =========================================================================
 * 1. THEATRE OWNER ROUTES (/api/v1/owner/theatres)
 * ========================================================================= */
export const theatreOwnerRoutes = Router();

theatreOwnerRoutes.use(authenticate);
theatreOwnerRoutes.use(authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN));

theatreOwnerRoutes.post(
  '/',
  authorizePermission(Permissions.THEATRE_CREATE),
  validate(registerTheatreSchema),
  TheatreController.registerTheatre
);

theatreOwnerRoutes.get(
  '/',
  authorizePermission(Permissions.THEATRE_READ),
  validate(ownerTheatreQuerySchema, 'query'),
  TheatreController.getMyTheatres
);

theatreOwnerRoutes.get(
  '/:theatreId',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.getTheatreByIdForOwner
);

theatreOwnerRoutes.patch(
  '/:theatreId',
  authorizePermission(Permissions.THEATRE_UPDATE),
  validate(paramTheatreIdSchema, 'params'),
  validate(updateTheatreSchema),
  TheatreController.updateTheatre
);

theatreOwnerRoutes.patch(
  '/:theatreId/operations',
  authorizePermission(Permissions.THEATRE_UPDATE),
  validate(paramTheatreIdSchema, 'params'),
  validate(updateTheatreOperationsSchema),
  TheatreController.updateOperations
);

theatreOwnerRoutes.patch(
  '/:theatreId/media',
  authorizePermission(Permissions.THEATRE_UPDATE),
  validate(paramTheatreIdSchema, 'params'),
  validate(updateTheatreMediaSchema),
  TheatreController.updateMedia
);

theatreOwnerRoutes.delete(
  '/:theatreId',
  authorizePermission(Permissions.THEATRE_DELETE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.softDeleteTheatre
);

// Staff management under theatre
theatreOwnerRoutes.post(
  '/:theatreId/staff',
  authorizePermission(Permissions.STAFF_MANAGE),
  validate(paramTheatreIdSchema, 'params'),
  validate(assignStaffSchema),
  TheatreController.assignStaff
);

theatreOwnerRoutes.get(
  '/:theatreId/staff',
  authorizePermission(Permissions.STAFF_MANAGE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.getTheatreStaff
);

theatreOwnerRoutes.delete(
  '/:theatreId/staff/:userId',
  authorizePermission(Permissions.STAFF_MANAGE),
  validate(paramStaffSchema, 'params'),
  TheatreController.removeStaff
);

/* =========================================================================
 * 2. SUPER ADMIN ROUTES (/api/v1/admin/theatres)
 * ========================================================================= */
export const theatreAdminRoutes = Router();

theatreAdminRoutes.use(authenticate);
theatreAdminRoutes.use(authorizeRoles(Roles.SUPER_ADMIN));

theatreAdminRoutes.get(
  '/',
  authorizePermission(Permissions.THEATRE_READ),
  validate(adminTheatreQuerySchema, 'query'),
  TheatreController.getAllTheatresAdmin
);

theatreAdminRoutes.get(
  '/:theatreId',
  authorizePermission(Permissions.THEATRE_READ),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.getTheatreByIdAdmin
);

theatreAdminRoutes.patch(
  '/:theatreId/approve',
  authorizePermission(Permissions.THEATRE_APPROVE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.approveTheatre
);

theatreAdminRoutes.patch(
  '/:theatreId/reject',
  authorizePermission(Permissions.THEATRE_APPROVE),
  validate(paramTheatreIdSchema, 'params'),
  validate(rejectTheatreSchema),
  TheatreController.rejectTheatre
);

theatreAdminRoutes.patch(
  '/:theatreId/suspend',
  authorizePermission(Permissions.THEATRE_APPROVE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.suspendTheatre
);

theatreAdminRoutes.patch(
  '/:theatreId/reactivate',
  authorizePermission(Permissions.THEATRE_APPROVE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.reactivateTheatre
);

theatreAdminRoutes.patch(
  '/:theatreId',
  authorizePermission(Permissions.THEATRE_UPDATE),
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.updateTheatreAdmin
);

/* =========================================================================
 * 3. PUBLIC THEATRE ROUTES (/api/v1/theatres)
 * ========================================================================= */
export const theatrePublicRoutes = Router();

theatrePublicRoutes.get(
  '/',
  validate(publicTheatreQuerySchema, 'query'),
  TheatreController.getPublicTheatres
);

theatrePublicRoutes.get(
  '/id/:theatreId',
  validate(paramTheatreIdSchema, 'params'),
  TheatreController.getPublicTheatreById
);

theatrePublicRoutes.get('/:slug', TheatreController.getPublicTheatreBySlug);

/* =========================================================================
 * 4. PUBLIC & ADMIN CITY ROUTES (/api/v1/cities)
 * ========================================================================= */
export const cityPublicRoutes = Router();

cityPublicRoutes.get('/', TheatreController.getActiveCities);

cityPublicRoutes.post(
  '/',
  authenticate,
  authorizeRoles(Roles.SUPER_ADMIN),
  validate(createCitySchema),
  TheatreController.createCity
);

export default {
  theatreOwnerRoutes,
  theatreAdminRoutes,
  theatrePublicRoutes,
  cityPublicRoutes
};
