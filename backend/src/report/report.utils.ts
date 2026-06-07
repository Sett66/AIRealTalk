import type { GrammarIssue, LlmCorrection } from '@airealtalk/shared';

const CATEGORY_LABELS: Record<LlmCorrection['category'], string> = {
  tense: '时态',
  preposition: '介词',
  collocation: '搭配',
  expression: '表达',
  other: '其他',
};

export function aggregateGrammarIssues(
  corrections: LlmCorrection[],
): GrammarIssue[] {
  const counts = new Map<string, number>();

  for (const correction of corrections) {
    const type = CATEGORY_LABELS[correction.category] ?? correction.category;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}

export function ensureMinimumCorrections(
  corrections: LlmCorrection[],
  userUtterances: string[],
  minimum = 3,
): LlmCorrection[] {
  const result = [...corrections];
  const seen = new Set(
    result.map(
      (correction) =>
        `${correction.original}|${correction.suggestion}|${correction.category}`,
    ),
  );

  for (const utterance of userUtterances) {
    if (result.length >= minimum) {
      break;
    }

    const trimmed = utterance.trim();
    if (!trimmed) {
      continue;
    }

    const fallback: LlmCorrection = {
      original: trimmed,
      suggestion: `Try polishing: "${trimmed}" with clearer grammar and richer detail.`,
      category: 'expression',
    };
    const key = `${fallback.original}|${fallback.suggestion}|${fallback.category}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(fallback);
    }
  }

  return result;
}
