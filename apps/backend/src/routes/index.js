import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Mount infrastructure health endpoints
router.use('/health', healthRoutes);

// Modular domain routes will be mounted here in subsequent parts:
// router.use('/auth', authRoutes);
// router.use('/movies', movieRoutes);
// router.use('/theatres', theatreRoutes);
// router.use('/shows', showRoutes);
// router.use('/bookings', bookingRoutes);

export default router;
