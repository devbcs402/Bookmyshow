import { Router } from 'express';
import BranchController from './branch.controller.js';
import {
  authenticate,
  authorizeRoles,
  authorizePermission
} from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  registerTheatreSchema,
  updateTheatreSchema,
  paramTheatreIdSchema,
  paramBranchIdSchema
} from '../theatre.validation.js';
import { Roles, Permissions } from '../../auth/auth.constants.js';

export const branchRoutes = Router();

// All branch endpoints require authenticated THEATRE_OWNER or SUPER_ADMIN
branchRoutes.use(authenticate);
branchRoutes.use(
  authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN),
  authorizePermission(Permissions.THEATRE_UPDATE)
);

// Theatre-scoped branch sub-routes
branchRoutes.post(
  '/theatres/:theatreId/branches',
  validate(paramTheatreIdSchema, 'params'),
  validate(registerTheatreSchema),
  BranchController.createBranch
);

branchRoutes.get(
  '/theatres/:theatreId/branches',
  validate(paramTheatreIdSchema, 'params'),
  BranchController.listBranches
);

// Direct branch routes
branchRoutes.get(
  '/branches/:branchId',
  validate(paramBranchIdSchema, 'params'),
  BranchController.getBranch
);

branchRoutes.patch(
  '/branches/:branchId',
  validate(paramBranchIdSchema, 'params'),
  validate(updateTheatreSchema),
  BranchController.updateBranch
);

branchRoutes.patch(
  '/branches/:branchId/status',
  validate(paramBranchIdSchema, 'params'),
  BranchController.toggleStatus
);

branchRoutes.delete(
  '/branches/:branchId',
  validate(paramBranchIdSchema, 'params'),
  BranchController.deleteBranch
);

export default branchRoutes;

