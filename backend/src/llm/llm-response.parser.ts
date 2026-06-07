import {
  LlmTurnResponseSchema,
  type LlmTurnResponse,
} from '@airealtalk/shared';

const DEFAULT_REPLY = "Sorry, I didn't catch that. Could you say it again?";

/** Strip ```json fences and other common LLM wrapping before JSON.parse. */
export function stripLlmResponseWrapper(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const json: unknown = JSON.parse(raw);
    return typeof json === 'object' && json !== null && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function extractReplyField(raw: string): string | null {
  const object = tryParseJsonObject(raw);
  if (object && typeof object.reply === 'string' && object.reply.trim()) {
    return object.reply.trim();
  }

  const match = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (!match) {
    return null;
  }

  try {
    const reply = JSON.parse(`"${match[1]}"`);
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  }
}

export function parseLlmResponse(raw: string): LlmTurnResponse | null {
  const cleaned = stripLlmResponseWrapper(raw);

  try {
    const json: unknown = JSON.parse(cleaned);
    return LlmTurnResponseSchema.parse(json);
  } catch {
    const reply = extractReplyField(cleaned);
    if (!reply) {
      return null;
    }

    return {
      reply,
      hints: [],
      corrections: [],
    };
  }
}

export function fallbackLlmResponse(raw: string): LlmTurnResponse {
  const cleaned = stripLlmResponseWrapper(raw);
  const parsed = parseLlmResponse(cleaned);
  if (parsed) {
    return parsed;
  }

  const reply = extractReplyField(cleaned) ?? cleaned.trim();

  return {
    reply: reply || DEFAULT_REPLY,
    hints: [],
    corrections: [],
  };
}
