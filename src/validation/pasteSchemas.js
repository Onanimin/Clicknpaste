import { z } from 'zod';

export const createPasteSchema = z.object({
  content: z.string().min(1, 'content is required'),
  ttl_seconds: z.number().int().min(1).optional(),
  max_views: z.number().int().min(1).optional(),
  password: z.string().min(4).max(128).optional()
});

export const pasteParamsSchema = z.object({
  id: z.string().min(1).max(64)
});