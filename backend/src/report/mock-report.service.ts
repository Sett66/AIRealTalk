import { Injectable, Logger } from '@nestjs/common';
import type { LlmCorrection, SessionReport } from '@airealtalk/shared';
import { computeWpm } from './report-metrics';
import { ReportService, type SessionReportInput } from './report.service';
import {
  aggregateGrammarIssues,
  ensureMinimumCorrections,
} from './report.utils';

function buildMockCorrections(userUtterances: string[]): LlmCorrection[] {
  const corrections: LlmCorrection[] = [];

  for (const utterance of userUtterances) {
    const lower = utterance.toLowerCase();

    if (/\bi (go|goes)\b/.test(lower) && /\byesterday\b/.test(lower)) {
      corrections.push({
        original: utterance,
        suggestion: utterance.replace(/\bgo(es)?\b/i, 'went'),
        category: 'tense',
      });
    }

    if (/\bvery a\b/i.test(utterance)) {
      corrections.push({
        original: utterance,
        suggestion: utterance.replace(/\bvery a\b/i, 'a very'),
        category: 'collocation',
      });
    }

    if (/\bgood at\.\s*$/i.test(utterance)) {
      corrections.push({
        original: utterance,
        suggestion: utterance.replace(
          /\bgood at\.\s*$/i,
          'good at solving technical problems.',
        ),
        category: 'expression',
      });
    }
  }

  return corrections;
}

@Injectable()
export class MockReportService extends ReportService {
  private readonly logger = new Logger(MockReportService.name);

  async generateReport(input: SessionReportInput): Promise<SessionReport> {
    const userUtterances = input.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content);

    const generated = buildMockCorrections(userUtterances);
    const corrections = ensureMinimumCorrections(
      [...input.accumulatedCorrections, ...generated],
      userUtterances,
    );

    const goalCoverage = Math.min(100, Math.max(20, input.turnCount * 18));
    const wpm = computeWpm(input.userWordCount, input.durationSec);

    this.logger.log(
      `Mock report session=${input.sessionId} turns=${input.turnCount} corrections=${corrections.length}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      sessionId: input.sessionId,
      scenarioId: input.scenario.id,
      durationSec: Math.round(input.durationSec),
      turnCount: input.turnCount,
      wpm,
      goalCoverage,
      corrections,
      grammarIssues: aggregateGrammarIssues(corrections),
      summary:
        `本次练习共 ${input.turnCount} 轮，有效发言约 ${Math.round(input.durationSec)} 秒。` +
        `场景目标覆盖约 ${goalCoverage}%，继续加油！`,
    };
  }
}
