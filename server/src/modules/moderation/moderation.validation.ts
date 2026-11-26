import { z } from 'zod';

export const updatePostingSettingsSchema = z.object({
  autoPublishStudentReports: z.boolean(),
});

export const listPendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const moderationItemIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Item id is not valid'),
});

export type UpdatePostingSettingsInput = z.infer<typeof updatePostingSettingsSchema>;
export type ListPendingQuery = z.infer<typeof listPendingQuerySchema>;
