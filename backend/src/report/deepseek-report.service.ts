import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';
import type { SessionReport } from '@airealtalk/shared';
import { computeWpm } from './report-metrics';
import { parseReportLlmOutput } from './report-response.parser';
import { ReportService, type SessionReportInput } from './report.service';
import {
  aggregateGrammarIssues,
  ensureMinimumCorrections,
} from './report.utils';

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: string;
  }>;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class DeepSeekReportService extends ReportService {
  private readonly logger = new Logger(DeepSeekReportService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async generateReport(input: SessionReportInput): Promise<SessionReport> {
    const llmOutput = await this.fetchReportOutput(input);
    const userUtterances = input.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content);

    const corrections = ensureMinimumCorrections(
      [...input.accumulatedCorrections, ...llmOutput.corrections],
      userUtterances,
    );

    const grammarIssues =
      llmOutput.grammarIssues.length > 0
        ? llmOutput.grammarIssues
        : aggregateGrammarIssues(corrections);

    return {
      sessionId: input.sessionId,
      scenarioId: input.scenario.id,
      durationSec: Math.round(input.durationSec),
      turnCount: input.turnCount,
      wpm: computeWpm(input.userWordCount, input.durationSec),
      goalCoverage: llmOutput.goalCoverage,
      corrections,
      grammarIssues,
      summary: llmOutput.summary,
    };
  }

  private async fetchReportOutput(input: SessionReportInput) {
    let lastRaw = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const raw = await this.callApi(input, attempt > 0, attempt < 2);
      if (!raw) {
        continue;
      }

      lastRaw = raw;
      const parsed = parseReportLlmOutput(raw);
      if (parsed) {
        return parsed;
      }

      this.logger.warn(
        `DeepSeek report JSON parse failed on attempt ${attempt + 1}/${MAX_ATTEMPTS}`,
      );
    }

    if (lastRaw) {
      throw new Error('课后报告格式解析失败，请重试');
    }

    throw new Error('课后报告生成失败，请稍后重试');
  }

  private buildPrompt(input: SessionReportInput, isRetry: boolean): string {
    const transcript = input.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    const goals = input.scenario.goals.map((goal) => `- ${goal}`).join('\n');

    let prompt = `Analyze this English speaking practice session and output JSON only.

Scenario: ${input.scenario.titleEn} (${input.scenario.title})
Role: ${input.scenario.role}
Goals:
${goals}

Transcript:
${transcript}

Output JSON shape:
{
  "summary": "2-3 sentence encouraging summary in Chinese",
  "goalCoverage": 0-100,
  "corrections": [
    { "original": "user phrase", "suggestion": "better phrase", "category": "tense|preposition|collocation|expression|other" }
  ],
  "grammarIssues": [{ "type": "时态", "count": 1 }]
}

Rules:
- Include at least 3 corrections from the user's actual utterances when possible.
- grammarIssues counts should match corrections by category (Chinese labels: 时态/介词/搭配/表达/其他).
- goalCoverage reflects how well session goals were addressed.
- Focus on language form, not interview content strategy.`;

    if (isRetry) {
      prompt += '\nIMPORTANT: Respond with valid JSON only.';
    }

    return prompt;
  }

  private async callApi(
    input: SessionReportInput,
    isRetry: boolean,
    useJsonFormat: boolean,
  ): Promise<string | null> {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseUrl =
      this.config.get<string>('DEEPSEEK_BASE_URL') ??
      'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }

    try {
      const response = await axios.post<DeepSeekChatResponse>(
        `${baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are an English coach generating structured post-session reports.',
            },
            {
              role: 'user',
              content: this.buildPrompt(input, isRetry),
            },
          ],
          ...(useJsonFormat
            ? { response_format: { type: 'json_object' as const } }
            : {}),
          temperature: 0.4,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        },
      );

      const content = response.data.choices?.[0]?.message?.content?.trim();
      return content || null;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        throw new Error(`DeepSeek 报告请求失败 (${String(status)})`);
      }

      throw error;
    }
  }
}
