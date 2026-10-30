import { Router } from 'express';
import GenreController from './genre.controller.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createGenreValidation,
  updateGenreValidation,
  genreIdParamValidation
} from './movie.validation.js';
import { Roles } from '../auth/auth.constants.js';

// Public Genre Routes mounted at /api/v1/genres
export const genrePublicRoutes = Router();
genrePublicRoutes.get('/', GenreController.getGenres);

// Admin Genre Routes mounted at /api/v1/admin/genres
export const genreAdminRoutes = Router();
genreAdminRoutes.use(authenticate, authorizeRoles(Roles.SUPER_ADMIN));

genreAdminRoutes.post('/', validate(createGenreValidation), GenreController.createGenre);
genreAdminRoutes.patch('/:genreId', validate(updateGenreValidation), GenreController.updateGenre);
genreAdminRoutes.delete('/:genreId', validate(genreIdParamValidation), GenreController.deleteGenre);

export default {
  genrePublicRoutes,
  genreAdminRoutes
};
