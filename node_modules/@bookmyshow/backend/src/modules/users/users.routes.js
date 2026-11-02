import { Router } from 'express';
import UsersController from './users.controller.js';
import BookingController from '../bookings/booking.controller.js';
import recentlyViewedRoutes from '../discovery/routes/recently-viewed.routes.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateProfileValidation, sessionIdParamValidation } from './users.validation.js';
import { customerBookingsQueryValidation } from '../bookings/booking.validation.js';

const router = Router();

// All user management routes require an authenticated active session
router.use(authenticate);

// Profile
router.get('/me', UsersController.getProfile);
router.patch('/me', validate(updateProfileValidation), UsersController.updateProfile);
router.get('/me/status', UsersController.getAccountStatus);
router.delete('/me', UsersController.deactivateAccount);

// Recently Viewed Movies (Discovery Module)
router.use('/me/recently-viewed', recentlyViewedRoutes);

// Bookings
router.get(
  '/me/bookings',
  validate(customerBookingsQueryValidation),
  BookingController.getMyBookings
);

// Session Management
router.get('/me/sessions', UsersController.getSessions);
router.delete(
  '/me/sessions/:sessionId',
  validate(sessionIdParamValidation),
  UsersController.revokeSession
);
router.delete('/me/sessions', UsersController.revokeAllOtherSessions);

export default router;
