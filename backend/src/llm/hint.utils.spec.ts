import type { LlmHint } from '@airealtalk/shared';
import { MAX_HINTS_PER_TURN, mergeInConversationHints } from './hint.utils';

describe('mergeInConversationHints', () => {
  it('includes both major and minor LLM hints', () => {
    const llmHints: LlmHint[] = [
      { severity: 'major', message: 'Use past tense for yesterday.' },
      { severity: 'minor', message: 'Try a richer vocabulary.' },
    ];

    expect(mergeInConversationHints(llmHints, 'I go yesterday.')).toEqual([
      { severity: 'major', message: 'Use past tense for yesterday.' },
      { severity: 'minor', message: 'Try a richer vocabulary.' },
    ]);
  });

  it('adds heuristic hints for incomplete sentences', () => {
    const hints = mergeInConversationHints([], 'Most challenging. I am not good at.');

    expect(hints.length).toBeGreaterThan(0);
    expect(hints.every((hint) => hint.severity === 'major' || hint.severity === 'minor')).toBe(
      true,
    );
  });

  it('dedupes identical messages from heuristic and LLM', () => {
    const llmHints: LlmHint[] = [
      {
        severity: 'major',
        message: 'Sentence seems incomplete — try a full answer.',
      },
    ];

    const hints = mergeInConversationHints(llmHints, 'And.');

    expect(
      hints.filter(
        (hint) => hint.message === 'Sentence seems incomplete — try a full answer.',
      ),
    ).toHaveLength(1);
  });

  it('filters content-advice hints from LLM output', () => {
    const llmHints: LlmHint[] = [
      {
        severity: 'minor',
        message: 'Mention your interest in the major, not just salary.',
      },
      { severity: 'minor', message: 'Use "because" with a complete clause.' },
    ];

    expect(mergeInConversationHints(llmHints, 'Because salary is good.')).toEqual([
      { severity: 'minor', message: 'Use "because" with a complete clause.' },
    ]);
  });

  it('caps hints per turn', () => {
    const llmHints: LlmHint[] = Array.from({ length: 6 }, (_, index) => ({
      severity: 'minor' as const,
      message: `Hint number ${index + 1}`,
    }));

    expect(mergeInConversationHints(llmHints, 'plain text').length).toBe(
      MAX_HINTS_PER_TURN,
    );
  });
});
