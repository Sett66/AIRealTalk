import { z } from 'zod';
import { SentenceScoreSchema } from './session-report.schema';

export const PronunciationSubmitPayloadSchema = z.object({
  pronunciationAvg: z.number().min(0).max(100),
  sentenceScores: z.array(SentenceScoreSchema),
});

export type PronunciationSubmitPayload = z.infer<
  typeof PronunciationSubmitPayloadSchema
>;
