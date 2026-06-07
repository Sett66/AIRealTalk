import { Logger } from '@nestjs/common';
import type { LlmHint } from '@airealtalk/shared';
import { filterLanguageOnlyHints } from './hint-filter';
import { detectHeuristicHints } from './hint-heuristics';

export const MAX_HINTS_PER_TURN = 5;

function dedupeHints(hints: LlmHint[]): LlmHint[] {
  const seen = new Set<string>();
  const result: LlmHint[] = [];

  for (const hint of hints) {
    const key = hint.message.toLowerCase().trim();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(hint);
  }

  return result;
}

/** Merge heuristic + LLM hints; major issues are listed before minor. */
export function mergeInConversationHints(
  llmHints: LlmHint[],
  userText: string,
  logger?: Logger,
): LlmHint[] {
  const heuristicHints = detectHeuristicHints(userText);
  const languageHints = filterLanguageOnlyHints(llmHints);
  const dropped = llmHints.length - languageHints.length;
  if (dropped > 0) {
    logger?.debug(`Filtered ${dropped} non-language hint(s) from LLM output`);
  }

  const combined = dedupeHints([...heuristicHints, ...languageHints]);

  const major = combined.filter((hint) => hint.severity === 'major');
  const minor = combined.filter((hint) => hint.severity === 'minor');
  const merged = [...major, ...minor];

  if (merged.length > MAX_HINTS_PER_TURN) {
    logger?.warn(
      `Capping hints from ${merged.length} to ${MAX_HINTS_PER_TURN} for turn`,
    );
  }

  return merged.slice(0, MAX_HINTS_PER_TURN);
}
