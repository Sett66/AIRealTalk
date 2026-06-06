import { z } from 'zod';

export const SessionPhaseSchema = z.enum([
  'idle',
  'listening',
  'processing',
  'speaking',
]);

export type SessionPhase = z.infer<typeof SessionPhaseSchema>;
