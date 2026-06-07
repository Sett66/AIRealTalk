import { fallbackLlmResponse, parseLlmResponse } from './llm-response.parser';

describe('parseLlmResponse', () => {
  it('parses valid LlmTurnResponse JSON', () => {
    const result = parseLlmResponse(
      JSON.stringify({
        reply: 'Hello there!',
        hints: [],
        corrections: [],
      }),
    );

    expect(result).toEqual({
      reply: 'Hello there!',
      hints: [],
      corrections: [],
    });
  });

  it('parses JSON wrapped in markdown fences', () => {
    const result = parseLlmResponse(
      '```json\n{"reply":"Hello!","hints":[],"corrections":[]}\n```',
    );

    expect(result?.reply).toBe('Hello!');
  });

  it('extracts reply when full schema validation fails', () => {
    const result = parseLlmResponse(
      JSON.stringify({
        reply: 'Still usable reply',
        hints: [{ severity: 'major', message: 'Fix tense' }],
        corrections: 'invalid',
      }),
    );

    expect(result).toEqual({
      reply: 'Still usable reply',
      hints: [],
      corrections: [],
    });
  });

  it('returns null for malformed JSON', () => {
    expect(parseLlmResponse('not json')).toBeNull();
  });

  it('returns null when schema validation fails', () => {
    expect(parseLlmResponse(JSON.stringify({ reply: 123 }))).toBeNull();
  });
});

describe('fallbackLlmResponse', () => {
  it('uses raw text as reply', () => {
    expect(fallbackLlmResponse('Plain text reply')).toEqual({
      reply: 'Plain text reply',
      hints: [],
      corrections: [],
    });
  });

  it('extracts reply from JSON-shaped fallback text', () => {
    expect(
      fallbackLlmResponse(
        '{"reply":"That sounds like a great project.","hints":[],"corrections":[]}',
      ),
    ).toEqual({
      reply: 'That sounds like a great project.',
      hints: [],
      corrections: [],
    });
  });

  it('uses default reply when raw text is empty', () => {
    expect(fallbackLlmResponse('   ').reply).toContain('Sorry');
  });
});
