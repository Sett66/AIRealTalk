import type { LlmTurnResponse, Scenario } from '@airealtalk/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const JSON_OUTPUT_INSTRUCTION = `Output JSON only with this exact shape:
{
  "reply": "your spoken English response",
  "hints": [],
  "corrections": []
}
Always return an empty hints array and empty corrections array for now.`;

export abstract class LlmService {
  buildSystemPrompt(scenario: Scenario): string {
    const goalsList = scenario.goals.map((goal) => `- ${goal}`).join('\n');

    return `You are ${scenario.role}.
This is an English speaking practice session for ${scenario.difficulty} level learners.

Session goals:
${goalsList}

Stay in character throughout the conversation. Respond naturally in English with 1-3 short sentences. Be encouraging and appropriate for ${scenario.difficulty} learners.

${JSON_OUTPUT_INSTRUCTION}`;
  }

  abstract generateReply(
    messages: ChatMessage[],
    scenario: Scenario,
  ): Promise<LlmTurnResponse>;
}
