import { Router } from 'express';
import RecentlyViewedController from '../controllers/recently-viewed.controller.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  recentlyViewedParamValidation,
  recentlyViewedQueryValidation
} from '../validators/discovery.validation.js';

const router = Router();

// All recently viewed operations require active authenticated user session
router.use(authenticate);

router.post(
  '/:movieId',
  validate(recentlyViewedParamValidation, 'params'),
  RecentlyViewedController.recordMovieView
);

router.get(
  '/',
  validate(recentlyViewedQueryValidation, 'query'),
  RecentlyViewedController.getRecentlyViewed
);

router.delete(
  '/',
  RecentlyViewedController.clearRecentlyViewed
);

export default router;

