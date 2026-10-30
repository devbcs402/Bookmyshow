import { Router } from 'express';
import DiscoveryController from '../controllers/discovery.controller.js';
import { optionalAuthenticate } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  recommendationsQueryValidation,
  searchSuggestionsQueryValidation,
  locationDiscoveryQueryValidation
} from '../validators/discovery.validation.js';

export const recommendationRoutes = Router();
recommendationRoutes.get(
  '/',
  optionalAuthenticate,
  validate(recommendationsQueryValidation, 'query'),
  DiscoveryController.getRecommendations
);

export const searchSuggestionRoutes = Router();
searchSuggestionRoutes.get(
  '/suggestions',
  validate(searchSuggestionsQueryValidation, 'query'),
  DiscoveryController.getSearchSuggestions
);

export const locationDiscoveryRoutes = Router();
locationDiscoveryRoutes.get(
  '/',
  validate(locationDiscoveryQueryValidation, 'query'),
  DiscoveryController.getLocationDiscovery
);

export default {
  recommendationRoutes,
  searchSuggestionRoutes,
  locationDiscoveryRoutes
};

