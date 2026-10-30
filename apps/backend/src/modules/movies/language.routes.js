import { Router } from 'express';
import LanguageController from './language.controller.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createLanguageValidation,
  updateLanguageValidation,
  languageIdParamValidation
} from './movie.validation.js';
import { Roles } from '../auth/auth.constants.js';

// Public Language Routes mounted at /api/v1/languages
export const languagePublicRoutes = Router();
languagePublicRoutes.get('/', LanguageController.getLanguages);

// Admin Language Routes mounted at /api/v1/admin/languages
export const languageAdminRoutes = Router();
languageAdminRoutes.use(authenticate, authorizeRoles(Roles.SUPER_ADMIN));

languageAdminRoutes.post(
  '/',
  validate(createLanguageValidation),
  LanguageController.createLanguage
);
languageAdminRoutes.patch(
  '/:languageId',
  validate(updateLanguageValidation),
  LanguageController.updateLanguage
);
languageAdminRoutes.delete(
  '/:languageId',
  validate(languageIdParamValidation),
  LanguageController.deleteLanguage
);

export default {
  languagePublicRoutes,
  languageAdminRoutes
};
