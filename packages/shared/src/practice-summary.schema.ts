import { z } from 'zod';

/** 本地练习历史摘要（SPEC §5.3） */
export const PracticeSummarySchema = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  date: z.string(),
  pronunciationAvg: z.number().min(0).max(100).optional(),
  turnCount: z.number().int().nonnegative(),
  durationSec: z.number().nonnegative(),
});

export type PracticeSummary = z.infer<typeof PracticeSummarySchema>;
