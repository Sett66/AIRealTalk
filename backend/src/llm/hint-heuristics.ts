import type { LlmHint } from '@airealtalk/shared';

const COMPLETE_SHORT_PHRASES =
  /^(yes|no|ok|okay|sure|thanks|thank you|hi|hello|bye|goodbye|please|sorry|right|correct|exactly|maybe|fine|great|good|well|and|but)\.?$/i;

const TRAILING_INCOMPLETE =
  /\b(and|or|but|because|so|if|when|that|which|who|to|at|in|on|for|with|of|the|a|an|my|your|his|her|our|their|about|from|by)\s*\.?$/i;

const DANGLING_GOOD_AT =
  /\b(good|bad|not good|not bad|hard|easy|difficult|challenging|strong|weak)\s+(at|with|for|about)\s*\.?$/i;

const ADJECTIVE_FRAGMENT = /^(most|very|really|quite|so|too)\s+\w+\s*\.?$/i;

/** Rule-based hints for incomplete or fragmentary ASR transcripts. */
export function detectHeuristicHints(userText: string): LlmHint[] {
  const trimmed = userText.trim();
  if (!trimmed) {
    return [];
  }

  const hints: LlmHint[] = [];
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = trimmed.toLowerCase();

  if (wordCount <= 2 && !COMPLETE_SHORT_PHRASES.test(trimmed)) {
    hints.push({
      severity: 'major',
      message: 'Sentence seems incomplete — try a full answer.',
    });
  }

  if (TRAILING_INCOMPLETE.test(trimmed)) {
    hints.push({
      severity: 'major',
      message: 'Sentence cuts off — finish the thought after that word.',
    });
  }

  if (DANGLING_GOOD_AT.test(trimmed)) {
    hints.push({
      severity: 'major',
      message: 'Missing what comes next — e.g. "good at teamwork".',
    });
  }

  if (ADJECTIVE_FRAGMENT.test(trimmed) && wordCount <= 3) {
    hints.push({
      severity: 'major',
      message: 'Sounds like a fragment — add the full sentence.',
    });
  }

  if (
    wordCount >= 4 &&
    wordCount <= 8 &&
    !/[.!?]$/.test(trimmed) &&
    !/\b(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|must)\b/i.test(
      lower,
    )
  ) {
    hints.push({
      severity: 'minor',
      message: 'Try ending with a clear, complete sentence.',
    });
  }

  return hints;
}
