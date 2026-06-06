import { Injectable, Logger } from '@nestjs/common';
import type { LlmTurnResponse } from '@airealtalk/shared';
import { LlmService } from './llm.service';

const MOCK_REPLY =
  "Sure! One coffee coming right up. Would you like milk or sugar with that?";

@Injectable()
export class MockLlmService extends LlmService {
  private readonly logger = new Logger(MockLlmService.name);

  async generateReply(userText: string): Promise<LlmTurnResponse> {
    this.logger.log(`Mock LLM reply for: "${userText}"`);
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      reply: MOCK_REPLY,
      hints: [],
      corrections: [],
    };
  }
}
