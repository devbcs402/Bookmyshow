import { z } from 'zod';

export const updateProfileValidation = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    cityId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for cityId')
      .optional()
  })
};

export const sessionIdParamValidation = {
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId for sessionId')
  })
};

export default {
  updateProfileValidation,
  sessionIdParamValidation
};
