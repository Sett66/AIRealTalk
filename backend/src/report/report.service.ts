import type { LlmCorrection, Scenario, SessionReport } from '@airealtalk/shared';
import type { ChatMessage } from '../llm/llm.service';

export interface SessionReportInput {
  sessionId: string;
  scenario: Scenario;
  messages: ChatMessage[];
  turnCount: number;
  durationSec: number;
  userWordCount: number;
  accumulatedCorrections: LlmCorrection[];
}

export abstract class ReportService {
  abstract generateReport(input: SessionReportInput): Promise<SessionReport>;
}
