import { z } from 'zod';

export const PronunciationAuthorizeRequestSchema = z.object({
  userId: z.string().min(1).optional(),
});

export const PronunciationAuthorizeResponseSchema = z.object({
  warrantId: z.string(),
  expireAt: z.number(),
  applicationId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  sig: z.string(),
  connectId: z.string(),
});

export type PronunciationAuthorizeRequest = z.infer<
  typeof PronunciationAuthorizeRequestSchema
>;
export type PronunciationAuthorizeResponse = z.infer<
  typeof PronunciationAuthorizeResponseSchema
>;
