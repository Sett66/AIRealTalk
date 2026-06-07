import type { LlmTurnResponse, Scenario } from '@airealtalk/shared';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const JSON_OUTPUT_INSTRUCTION = `Output JSON only with this exact shape:
{
  "reply": "your spoken English response",
  "hints": [{ "severity": "major" | "minor", "message": "brief in-conversation hint" }],
  "corrections": [{ "original": "user phrase", "suggestion": "better phrase", "category": "tense" }]
}

Hints rules (LANGUAGE FORM ONLY — grammar, phrasing, incomplete sentences):
- Hints correct HOW the user spoke English, NOT what they chose to say.
- severity "major": serious grammar errors, incomplete/fragment sentences, missing key words, wrong tense with time markers.
- severity "minor": awkward phrasing, word choice, collocation, missing articles, expression polish.
- ALWAYS check for incomplete sentences: very short fragments, trailing "and/at/about/for", dangling phrases like "I am not good at.", adjective-only fragments like "Most challenging."
- Include multiple hints when several language issues exist (typically 1-4 per turn).
- Keep each hint under 20 words, simple English or brief Chinese.

STRICTLY FORBIDDEN in hints (put these in "reply" as the interviewer, NEVER in hints):
- Interview strategy or answer-content advice (e.g. "mention your passion", "don't only talk about salary", "say why you're interested in the major").
- Suggesting different topics, motivations, or better answers to the question.
- Any hint that judges whether the user's answer is good enough substantively.

Use "hints": [] when the user's English is grammatically complete and clear, even if you want to probe deeper in your "reply".

Corrections: record grammar/expression fixes for the post-session report; category is one of tense, preposition, collocation, expression, other.`;

const B1_B2_GUIDANCE = `Learner level guidance (B1–B2):
- Use clear, natural spoken English. Prefer common words over rare vocabulary.
- Keep sentences short (1–3 sentences). One idea per sentence when possible.
- If the learner struggles, rephrase your question more simply — do NOT switch to Chinese.
- Be warm and encouraging. Acknowledge good attempts before asking follow-ups.
- Adjust follow-up difficulty to match their last answer length and grammar complexity.`;

export abstract class LlmService {
  buildSystemPrompt(scenario: Scenario): string {
    const goalsList = scenario.goals.map((goal) => `- ${goal}`).join('\n');

    return `You are ${scenario.role}.
This is an English speaking practice session for ${scenario.difficulty} level learners (CEFR B1–B2).

Session goals:
${goalsList}

Stay in character throughout the conversation. Respond naturally in English with 1-3 short sentences. Be encouraging and appropriate for ${scenario.difficulty} learners.

${B1_B2_GUIDANCE}

${JSON_OUTPUT_INSTRUCTION}`;
  }

  abstract generateReply(
    messages: ChatMessage[],
    scenario: Scenario,
  ): Promise<LlmTurnResponse>;
}
