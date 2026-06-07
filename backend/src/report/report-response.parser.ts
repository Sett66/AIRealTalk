import {
  SessionReportLlmOutputSchema,
  type SessionReportLlmOutput,
} from '@airealtalk/shared';
import { stripLlmResponseWrapper } from '../llm/llm-response.parser';

export function parseReportLlmOutput(raw: string): SessionReportLlmOutput | null {
  const cleaned = stripLlmResponseWrapper(raw);

  try {
    const json: unknown = JSON.parse(cleaned);
    return SessionReportLlmOutputSchema.parse(json);
  } catch {
    return null;
  }
}
