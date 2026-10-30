import { Router } from 'express';
import adminNotificationController from '../controllers/admin-notification.controller.js';
import { authenticate, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { Roles } from '../../auth/auth.constants.js';
import {
  broadcastAnnouncementSchema,
  adminListNotificationsSchema,
  notificationIdParamSchema
} from '../validators/notification.validation.js';

const router = Router();

// Administrative guard: Only Super Administrators can manage platform notifications
router.use(authenticate, authorize(Roles.SUPER_ADMIN));

router.post('/broadcast', validate(broadcastAnnouncementSchema), (req, res, next) =>
  adminNotificationController.broadcastAnnouncement(req, res, next)
);

router.get('/stats', (req, res, next) =>
  adminNotificationController.getDeliveryStats(req, res, next)
);

router.get('/', validate(adminListNotificationsSchema), (req, res, next) =>
  adminNotificationController.listAllNotifications(req, res, next)
);

router.get('/:id', validate(notificationIdParamSchema), (req, res, next) =>
  adminNotificationController.getNotificationDetails(req, res, next)
);

export default router;
