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

  it('uses default reply when raw text is empty', () => {
    expect(fallbackLlmResponse('   ').reply).toContain('Sorry');
  });
});
