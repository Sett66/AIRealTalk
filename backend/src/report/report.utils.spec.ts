import { aggregateGrammarIssues, ensureMinimumCorrections } from './report.utils';

describe('report.utils', () => {
  it('aggregates grammar issue counts by category label', () => {
    const issues = aggregateGrammarIssues([
      {
        original: 'I go yesterday',
        suggestion: 'I went yesterday',
        category: 'tense',
      },
      {
        original: 'very a big',
        suggestion: 'a very big',
        category: 'collocation',
      },
      {
        original: 'I go store',
        suggestion: 'I went to the store',
        category: 'tense',
      },
    ]);

    expect(issues).toEqual([
      { type: '时态', count: 2 },
      { type: '搭配', count: 1 },
    ]);
  });

  it('pads corrections to minimum count from user utterances', () => {
    const corrections = ensureMinimumCorrections(
      [],
      ['I like this job.', 'It is challenging.'],
      3,
    );

    expect(corrections.length).toBeGreaterThanOrEqual(3);
  });
});
