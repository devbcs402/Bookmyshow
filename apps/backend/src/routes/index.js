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
import {
  screenOwnerRoutes,
  screenAdminRoutes,
  screenPublicRoutes
} from '../modules/screens/screen.routes.js';
import {
  showOwnerRoutes,
  showPublicRoutes,
  movieShowsPublicRoutes,
  theatreShowsPublicRoutes
} from '../modules/shows/show.routes.js';
import seatLockRoutes from '../modules/seat-locks/seat-lock.routes.js';
import { bookingRoutes, bookingOwnerRoutes } from '../modules/bookings/booking.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import notificationRoutes from '../modules/notifications/routes/notification.routes.js';
import adminNotificationRoutes from '../modules/notifications/routes/admin-notification.routes.js';
import {
  recommendationRoutes,
  searchSuggestionRoutes,
  locationDiscoveryRoutes
} from '../modules/discovery/routes/discovery.routes.js';

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

// Theatre, Branch & Screen routes
router.use('/owner/theatres', theatreOwnerRoutes);
router.use('/owner', branchRoutes);
router.use('/owner', screenOwnerRoutes);
router.use('/admin/theatres', theatreAdminRoutes);
router.use('/admin/screens', screenAdminRoutes);
router.use('/theatres', theatrePublicRoutes);
router.use('/screens', screenPublicRoutes);
router.use('/cities', cityPublicRoutes);

// Admin Management routes
router.use('/admin/movies', movieAdminRoutes);
router.use('/admin/genres', genreAdminRoutes);
router.use('/admin/languages', languageAdminRoutes);

// Show Management & Scheduling routes
router.use('/owner/shows', showOwnerRoutes);
router.use('/shows', showPublicRoutes);
router.use('/shows', seatLockRoutes);
router.use('/movies', movieShowsPublicRoutes);
router.use('/theatres', theatreShowsPublicRoutes);

// Booking Engine routes (Part 10)
router.use('/bookings', bookingRoutes);
router.use('/owner/bookings', bookingOwnerRoutes);

// Payment Gateway routes (Part 11)
router.use('/payments', paymentRoutes);

// Notification System routes (Part 12)
router.use('/notifications', notificationRoutes);
router.use('/admin/notifications', adminNotificationRoutes);

// Discovery, Search & Recommendations Engine routes (Part 13)
router.use('/recommendations', recommendationRoutes);
router.use('/search', searchSuggestionRoutes);
router.use('/discovery/location', locationDiscoveryRoutes);

// Subsequent domain modules will be mounted here:

export default router;
