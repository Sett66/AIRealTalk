import { z } from 'zod';
import { LlmCorrectionSchema } from './llm-turn-response.schema';

export const GrammarIssueSchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative(),
});

export const SentenceScoreSchema = z.object({
  text: z.string(),
  score: z.number(),
});

/** LLM 课后报告 JSON 输出（不含会话统计字段） */
export const SessionReportLlmOutputSchema = z.object({
  summary: z.string(),
  goalCoverage: z.number().min(0).max(100),
  corrections: z.array(LlmCorrectionSchema),
  grammarIssues: z.array(GrammarIssueSchema),
});

/** 课后练习报告（SPEC §5.3） */
export const SessionReportSchema = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  durationSec: z.number().nonnegative(),
  turnCount: z.number().int().nonnegative(),
  wpm: z.number().nonnegative(),
  goalCoverage: z.number().min(0).max(100),
  pronunciationAvg: z.number().min(0).max(100).optional(),
  sentenceScores: z.array(SentenceScoreSchema).optional(),
  corrections: z.array(LlmCorrectionSchema),
  grammarIssues: z.array(GrammarIssueSchema),
  summary: z.string(),
});

export type GrammarIssue = z.infer<typeof GrammarIssueSchema>;
export type SentenceScore = z.infer<typeof SentenceScoreSchema>;
export type SessionReportLlmOutput = z.infer<typeof SessionReportLlmOutputSchema>;
export type SessionReport = z.infer<typeof SessionReportSchema>;
