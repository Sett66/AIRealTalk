import { Injectable, Logger } from '@nestjs/common';
import type { LlmTurnResponse, Scenario } from '@airealtalk/shared';
import { LlmService, type ChatMessage } from './llm.service';

const INTERVIEW_REPLIES = [
  "That's interesting. What motivated you to apply for this position?",
  'Can you describe a challenging situation you handled at work or school?',
  'How do you handle working under pressure or tight deadlines?',
  'Do you have any questions for me about the role or our team?',
];

@Injectable()
export class MockLlmService extends LlmService {
  private readonly logger = new Logger(MockLlmService.name);

  async generateReply(
    messages: ChatMessage[],
    scenario: Scenario,
  ): Promise<LlmTurnResponse> {
    const userTurns = messages.filter((message) => message.role === 'user').length;
    const replyIndex = Math.min(userTurns - 1, INTERVIEW_REPLIES.length - 1);
    const reply = INTERVIEW_REPLIES[Math.max(0, replyIndex)];

    this.logger.log(
      `Mock LLM reply for scenario "${scenario.id}" turn ${userTurns}: "${reply}"`,
    );
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      reply,
      hints: [],
      corrections: [],
    };
  }
}
