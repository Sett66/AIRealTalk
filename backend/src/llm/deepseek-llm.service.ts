import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';
import type { LlmTurnResponse } from '@airealtalk/shared';
import { LlmService } from './llm.service';
import { fallbackLlmResponse, parseLlmResponse } from './llm-response.parser';

const SYSTEM_PROMPT = `You are a friendly English conversation partner for B1-B2 learners practicing spoken English.
Respond naturally in English with 1-3 short sentences. Be encouraging.
Output JSON only with this exact shape:
{
  "reply": "your spoken English response",
  "hints": [],
  "corrections": []
}
Always return an empty hints array and empty corrections array for now.`;

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class DeepSeekLlmService extends LlmService {
  private readonly logger = new Logger(DeepSeekLlmService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async generateReply(userText: string): Promise<LlmTurnResponse> {
    let raw = await this.callApi(userText, false);
    let parsed = parseLlmResponse(raw);
    if (parsed) {
      return parsed;
    }

    this.logger.warn('DeepSeek JSON parse failed, retrying once');
    raw = await this.callApi(userText, true);
    parsed = parseLlmResponse(raw);
    if (parsed) {
      return parsed;
    }

    this.logger.warn('DeepSeek JSON parse failed after retry, using fallback');
    return fallbackLlmResponse(raw);
  }

  private async callApi(userText: string, isRetry: boolean): Promise<string> {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseUrl =
      this.config.get<string>('DEEPSEEK_BASE_URL') ??
      'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }

    const systemContent = isRetry
      ? `${SYSTEM_PROMPT}\nIMPORTANT: Your previous response was not valid JSON. Respond with valid JSON only.`
      : SYSTEM_PROMPT;

    try {
      const response = await axios.post<DeepSeekChatResponse>(
        `${baseUrl}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userText },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      );

      const content = response.data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('DeepSeek returned empty response');
      }

      return content;
    } catch (error) {
      if (isAxiosError(error)) {
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
