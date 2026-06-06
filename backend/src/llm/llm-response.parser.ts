import {
  LlmTurnResponseSchema,
  type LlmTurnResponse,
} from '@airealtalk/shared';

export function parseLlmResponse(raw: string): LlmTurnResponse | null {
  try {
    const json: unknown = JSON.parse(raw);
    return LlmTurnResponseSchema.parse(json);
  } catch {
    return null;
  }
}

export function fallbackLlmResponse(raw: string): LlmTurnResponse {
  const reply = raw.trim();
  return {
    reply:
      reply ||
      "Sorry, I didn't catch that. Could you say it again?",
    hints: [],
    corrections: [],
  };
}
