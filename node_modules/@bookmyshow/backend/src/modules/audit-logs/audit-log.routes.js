import { Router } from 'express';
import AuditLogController from './audit-log.controller.js';
import { authenticate, authorizeRoles } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { Roles } from '../auth/auth.constants.js';
import { queryAuditLogsSchema, auditLogIdParamSchema } from './audit-log.validation.js';

export const auditLogRoutes = Router();

// Strictly protect all administrative audit logs to SUPER_ADMIN role
auditLogRoutes.use(authenticate, authorizeRoles(Roles.SUPER_ADMIN));

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: Query append-only administrative audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: targetResource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - SUPER_ADMIN required
 */
auditLogRoutes.get('/', validate(queryAuditLogsSchema, 'query'), AuditLogController.getAuditLogs);

/**
 * @openapi
 * /admin/audit-logs/{auditLogId}:
 *   get:
 *     summary: Retrieve single audit log entry by ID
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditLogId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log record details
 *       404:
 *         description: Audit log record not found
 */
auditLogRoutes.get(
  '/:auditLogId',
  validate(auditLogIdParamSchema, 'params'),
  AuditLogController.getAuditLogById
);

export default auditLogRoutes;
