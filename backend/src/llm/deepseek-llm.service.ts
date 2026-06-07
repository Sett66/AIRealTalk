import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';
import type { LlmTurnResponse, Scenario } from '@airealtalk/shared';
import { LlmService, type ChatMessage } from './llm.service';
import { fallbackLlmResponse, parseLlmResponse } from './llm-response.parser';

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string;
  }>;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class DeepSeekLlmService extends LlmService {
  private readonly logger = new Logger(DeepSeekLlmService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async generateReply(
    messages: ChatMessage[],
    scenario: Scenario,
  ): Promise<LlmTurnResponse> {
    let lastRaw = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const isRetry = attempt > 0;
      const useJsonFormat = attempt < 2;

      const raw = await this.callApi(
        messages,
        scenario,
        isRetry,
        useJsonFormat,
      );

      if (!raw) {
        this.logger.warn(
          `DeepSeek empty response on attempt ${attempt + 1}/${MAX_ATTEMPTS}`,
        );
        continue;
      }

      lastRaw = raw;
      const parsed = parseLlmResponse(raw);
      if (parsed) {
        return parsed;
      }

      this.logger.warn(
        `DeepSeek JSON parse failed on attempt ${attempt + 1}/${MAX_ATTEMPTS}`,
      );
    }

    if (lastRaw) {
      this.logger.warn('DeepSeek using fallback after retries');
      return fallbackLlmResponse(lastRaw);
    }

    throw new Error(
      'DeepSeek 连续返回空回复，请稍后重试（json_object 模式已知偶发问题）',
    );
  }

  private async callApi(
    messages: ChatMessage[],
    scenario: Scenario,
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

    let systemContent = this.buildSystemPrompt(scenario);
    if (isRetry) {
      systemContent +=
        '\nIMPORTANT: Your previous response was invalid or empty. Respond with valid JSON only.';
    }

    try {
      const response = await axios.post<DeepSeekChatResponse>(
        `${baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemContent },
            ...messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
          ...(useJsonFormat
            ? { response_format: { type: 'json_object' as const } }
            : {}),
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 20_000,
        },
      );

      const choice = response.data.choices?.[0];
      const content = choice?.message?.content?.trim();

      if (!content) {
        this.logger.warn(
          `DeepSeek empty content (finish_reason=${choice?.finish_reason ?? 'unknown'}, json_format=${useJsonFormat})`,
        );
        return null;
      }

      return content;
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('AI 回复生成超时（20 秒），请检查网络后重试');
        }

        const status = error.response?.status;
        const apiMessage =
          typeof error.response?.data === 'object' &&
          error.response.data !== null &&
          'error' in error.response.data &&
          typeof (error.response.data as { error?: { message?: string } }).error
            ?.message === 'string'
            ? (error.response.data as { error: { message: string } }).error
                .message
            : error.message;

        if (status === 402) {
          throw new Error(
            'DeepSeek 账户余额不足，请前往 platform.deepseek.com 充值后再试',
          );
        }
        if (status === 401) {
          throw new Error(
            'DeepSeek API Key 无效，请检查 backend/.env 中的 DEEPSEEK_API_KEY',
          );
        }

        throw new Error(`DeepSeek 请求失败 (${String(status)}): ${apiMessage}`);
      }

      throw error;
    }
  }
}
