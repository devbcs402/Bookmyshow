import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';

const router = Router();

// Mount infrastructure health endpoints
router.use('/health', healthRoutes);

// Modular domain routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

// Subsequent domain modules will be mounted here:
// router.use('/movies', movieRoutes);
// router.use('/theatres', theatreRoutes);
// router.use('/shows', showRoutes);
// router.use('/bookings', bookingRoutes);

export default router;
