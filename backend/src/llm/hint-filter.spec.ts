import { filterLanguageOnlyHints } from './hint-filter';

describe('filterLanguageOnlyHints', () => {
  it('keeps grammar and phrasing hints', () => {
    const hints = [
      { severity: 'major' as const, message: 'Use past tense — "went" for yesterday.' },
      { severity: 'minor' as const, message: 'Use "a very", not "very a".' },
      { severity: 'major' as const, message: 'Sentence seems incomplete — try a full answer.' },
    ];

    expect(filterLanguageOnlyHints(hints)).toEqual(hints);
  });

  it('drops content or interview-strategy advice', () => {
    const hints = [
      {
        severity: 'minor' as const,
        message:
          '应该说为什么你对这个专业感兴趣，而不是只因为工资高。',
      },
      {
        severity: 'minor' as const,
        message: 'Mention your interest in the major, not just salary.',
      },
      {
        severity: 'minor' as const,
        message: 'You should talk about what you enjoy about computer science.',
      },
    ];

    expect(filterLanguageOnlyHints(hints)).toEqual([]);
  });
});
