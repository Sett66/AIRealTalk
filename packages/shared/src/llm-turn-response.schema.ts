import { z } from 'zod';

export const LlmHintSchema = z.object({
  severity: z.enum(['minor', 'major']),
  message: z.string(),
});

export const LlmCorrectionSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  category: z.enum([
    'tense',
    'preposition',
    'collocation',
    'expression',
    'other',
  ]),
});

/** LLM 单轮 JSON 输出（SPEC §5.3） */
export const LlmTurnResponseSchema = z.object({
  reply: z.string(),
  hints: z.array(LlmHintSchema),
  corrections: z.array(LlmCorrectionSchema),
});

export type LlmHint = z.infer<typeof LlmHintSchema>;
export type LlmCorrection = z.infer<typeof LlmCorrectionSchema>;
export type LlmTurnResponse = z.infer<typeof LlmTurnResponseSchema>;
