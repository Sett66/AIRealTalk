import { Injectable, Logger } from '@nestjs/common';
import type { LlmHint, LlmTurnResponse, Scenario } from '@airealtalk/shared';
import { mergeInConversationHints } from './hint.utils';
import { LlmService, type ChatMessage } from './llm.service';

const MOCK_REPLIES: Record<string, string[]> = {
  interview: [
    "That's interesting. What motivated you to apply for this position?",
    'Can you describe a challenging situation you handled at work or school?',
    'How do you handle working under pressure or tight deadlines?',
    'What are your greatest strengths for this role?',
    'Do you have any questions for me about the team or company?',
  ],
  restaurant: [
    'Great choice! Would you like that with a side salad or soup?',
    'Anything to drink? We have fresh juice, coffee, or iced tea.',
    'Are you allergic to anything I should note for the kitchen?',
    'Would you like dessert after your meal?',
    'Your total is ready whenever you are. Cash or card?',
  ],
  meeting: [
    'Thanks for the update. Were there any blockers on your side?',
    'How do you think we should prioritize the next sprint tasks?',
    'Does anyone have concerns about the timeline we discussed?',
    'Can we assign an owner for the follow-up action items?',
    'Any other topics before we wrap up for today?',
  ],
};

function detectGrammarHints(userText: string): LlmHint[] {
  const hints: LlmHint[] = [];
  const lower = userText.toLowerCase();

  if (
    /\b(go|goes|come|comes|do|does|is|are)\b/.test(lower) &&
    /\byesterday\b/.test(lower)
  ) {
    hints.push({
      severity: 'major',
      message: 'Past tense needed — e.g. "went" for yesterday.',
    });
  }

  if (/\bi (go|goes) to (?:the )?store\b/.test(lower)) {
    hints.push({
      severity: 'major',
      message: 'Use past tense: "I went to the store yesterday."',
    });
  }

  if (/\bvery a\b/i.test(userText)) {
    hints.push({
      severity: 'minor',
      message: 'Use "a very" or "quite a", not "very a".',
    });
  }

  return hints;
}

@Injectable()
export class MockLlmService extends LlmService {
  private readonly logger = new Logger(MockLlmService.name);

  async generateReply(
    messages: ChatMessage[],
    scenario: Scenario,
  ): Promise<LlmTurnResponse> {
    const replies =
      MOCK_REPLIES[scenario.id] ?? MOCK_REPLIES.interview;
    const userTurns = messages.filter((message) => message.role === 'user').length;
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    const replyIndex = Math.min(userTurns - 1, replies.length - 1);
    const reply = replies[Math.max(0, replyIndex)];
    const hints = lastUser
      ? mergeInConversationHints(
          detectGrammarHints(lastUser.content),
          lastUser.content,
          this.logger,
        )
      : [];

    this.logger.log(
      `Mock LLM reply for scenario "${scenario.id}" turn ${userTurns}: "${reply}"` +
        (hints.length > 0 ? ` hints=${hints.length}` : ''),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      reply,
      hints,
      corrections: [],
    };
  }
}
