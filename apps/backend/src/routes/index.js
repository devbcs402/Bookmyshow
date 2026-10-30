import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import { moviePublicRoutes, movieAdminRoutes } from '../modules/movies/movie.routes.js';
import { genrePublicRoutes, genreAdminRoutes } from '../modules/movies/genre.routes.js';
import { languagePublicRoutes, languageAdminRoutes } from '../modules/movies/language.routes.js';

import {
  theatreOwnerRoutes,
  theatreAdminRoutes,
  theatrePublicRoutes,
  cityPublicRoutes
} from '../modules/theatres/theatre.routes.js';
import branchRoutes from '../modules/theatres/branch/branch.routes.js';

const router = Router();

// Infrastructure health endpoints
router.use('/health', healthRoutes);

// Auth & User Management routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

// Movie Catalog & Taxonomic master routes
router.use('/movies', moviePublicRoutes);
router.use('/genres', genrePublicRoutes);
router.use('/languages', languagePublicRoutes);

// Theatre & Branch routes
router.use('/owner/theatres', theatreOwnerRoutes);
router.use('/owner', branchRoutes);
router.use('/admin/theatres', theatreAdminRoutes);
router.use('/theatres', theatrePublicRoutes);
router.use('/cities', cityPublicRoutes);

// Admin Management routes
router.use('/admin/movies', movieAdminRoutes);
router.use('/admin/genres', genreAdminRoutes);
router.use('/admin/languages', languageAdminRoutes);

// Subsequent domain modules will be mounted here:
// router.use('/shows', showRoutes);
// router.use('/bookings', bookingRoutes);

export default router;
