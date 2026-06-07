import { detectHeuristicHints } from './hint-heuristics';

describe('detectHeuristicHints', () => {
  it('flags very short incomplete fragments', () => {
    const hints = detectHeuristicHints('And.');

    expect(hints.some((hint) => hint.severity === 'major')).toBe(true);
  });

  it('flags sentences ending with dangling prepositions', () => {
    const hints = detectHeuristicHints('Most challenging. I am not good at.');

    expect(
      hints.some((hint) => hint.message.includes('Missing what comes next')),
    ).toBe(true);
  });

  it('flags adjective-only fragments', () => {
    const hints = detectHeuristicHints('Most challenging.');

    expect(
      hints.some((hint) => hint.message.includes('fragment')),
    ).toBe(true);
  });

  it('allows common short complete replies', () => {
    expect(detectHeuristicHints('Yes.')).toEqual([]);
    expect(detectHeuristicHints('Thank you.')).toEqual([]);
  });
});
