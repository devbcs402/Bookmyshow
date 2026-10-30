import { z } from 'zod';
import { TimeRange } from './analytics.constants.js';

export const analyticsQuerySchema = z
  .object({
    timeRange: z
      .enum([
        TimeRange.TODAY,
        TimeRange.YESTERDAY,
        TimeRange.LAST_7_DAYS,
        TimeRange.LAST_30_DAYS,
        TimeRange.THIS_MONTH,
        TimeRange.PREV_MONTH,
        TimeRange.CUSTOM
      ])
      .default(TimeRange.LAST_7_DAYS),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    theatreId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Theatre ID format')
      .optional()
  })
  .refine(
    data => {
      if (data.timeRange === TimeRange.CUSTOM) {
        return !!data.startDate && !!data.endDate;
      }
      return true;
    },
    {
      message: "startDate and endDate are required when timeRange is 'custom'",
      path: ['startDate']
    }
  );

export default {
  analyticsQuerySchema
};
