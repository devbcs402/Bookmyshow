import { Router } from 'express';
import HealthController from '../controllers/health.controller.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Comprehensive system health check
 *     description: Returns application status along with MongoDB and Redis dependency health metrics.
 *     tags:
 *       - Infrastructure
 *     responses:
 *       200:
 *         description: All systems and dependencies operational
 *       503:
 *         description: System degraded or dependency connection failed
 */
router.get('/', HealthController.getHealth);

/**
 * @openapi
 * /health/live:
 *   get:
 *     summary: Kubernetes Liveness probe
 *     description: Confirms the Node.js process is active and accepting requests.
 *     tags:
 *       - Infrastructure
 *     responses:
 *       200:
 *         description: Process is alive
 */
router.get('/live', HealthController.getLiveness);

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Kubernetes Readiness probe
 *     description: Confirms mandatory storage and cache dependencies are reachable before receiving production traffic.
 *     tags:
 *       - Infrastructure
 *     responses:
 *       200:
 *         description: Dependencies reachable; ready for traffic
 *       503:
 *         description: One or more dependencies unreachable
 */
router.get('/ready', HealthController.getReadiness);

export default router;
