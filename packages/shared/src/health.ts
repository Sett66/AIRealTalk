import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  useMockPronunciation: z.boolean().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
