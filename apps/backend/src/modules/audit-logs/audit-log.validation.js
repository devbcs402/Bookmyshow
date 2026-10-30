import { z } from 'zod';

export const queryAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().optional(),
  action: z.string().optional(),
  targetResource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const auditLogIdParamSchema = z.object({
  auditLogId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Audit Log ID format')
});

export default {
  queryAuditLogsSchema,
  auditLogIdParamSchema
};

