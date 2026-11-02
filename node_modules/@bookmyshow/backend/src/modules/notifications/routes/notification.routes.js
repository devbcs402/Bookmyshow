import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  getNotificationsSchema,
  notificationIdParamSchema,
  updatePreferencesSchema
} from '../validators/notification.validation.js';

const router = Router();

// All notification routes require authenticated user session
router.use(authenticate);

// Specific named routes must be registered before param route /:id
router.get('/unread-count', (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);

router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

router.get('/preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);

router.patch('/preferences', validate(updatePreferencesSchema), (req, res, next) =>
  notificationController.updatePreferences(req, res, next)
);

router.get('/', validate(getNotificationsSchema), (req, res, next) =>
  notificationController.getNotifications(req, res, next)
);

router.patch('/:id/read', validate(notificationIdParamSchema), (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

router.delete('/:id', validate(notificationIdParamSchema), (req, res, next) =>
  notificationController.deleteNotification(req, res, next)
);

export default router;
