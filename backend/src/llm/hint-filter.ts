import type { LlmHint } from '@airealtalk/shared';

/** Hints that advise answer content/strategy rather than language form. */
const CONTENT_ADVICE_PATTERNS = [
  /\b(you should|try to|better to|need to)\s+(say|talk|mention|explain|focus|share|describe)\b/i,
  /\b(instead of)\s+(just|only)\b/i,
  /\b(mention|talk about|focus on)\s+(your\s+)?(interest|passion|motivation|reason)\b/i,
  /\b(interested in|passion for|enjoy about)\s+(the\s+)?(major|subject|field|topic|role|job)\b/i,
  /\b(good job|salary|wage|career prospect|employment)\b/i,
  /\bwhat you (enjoy|like|love)\b/i,
  /应该说|感兴趣|工资|薪水|专业.*兴趣|不应该只|内容.*回答|答题|面试.*建议/,
];

export function isLanguageHint(hint: LlmHint): boolean {
  const message = hint.message.trim();
  if (!message) {
    return false;
  }

  return !CONTENT_ADVICE_PATTERNS.some((pattern) => pattern.test(message));
}

export function filterLanguageOnlyHints(hints: LlmHint[]): LlmHint[] {
  return hints.filter(isLanguageHint);
}
