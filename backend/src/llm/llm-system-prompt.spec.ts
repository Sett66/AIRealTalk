import { LlmService } from './llm.service';
import { MockLlmService } from './mock-llm.service';
import type { Scenario } from '@airealtalk/shared';

class TestLlmService extends LlmService {
  async generateReply() {
    return { reply: '', hints: [], corrections: [] };
  }
}

const interviewScenario: Scenario = {
  id: 'interview',
  title: '面试',
  titleEn: 'Job Interview',
  role: 'HR interviewer at a tech company',
  openingLine: 'Hi, thanks for coming in today.',
  goals: ['自我介绍', '回答行为面试题', '反问环节'],
  difficulty: 'B1-B2',
};

describe('LlmService.buildSystemPrompt', () => {
  const service = new TestLlmService();

  it('injects role, goals, and difficulty', () => {
    const prompt = service.buildSystemPrompt(interviewScenario);

    expect(prompt).toContain('HR interviewer at a tech company');
    expect(prompt).toContain('自我介绍');
    expect(prompt).toContain('回答行为面试题');
    expect(prompt).toContain('反问环节');
    expect(prompt).toContain('B1-B2');
    expect(prompt).toContain('"reply"');
    expect(prompt).toContain('LANGUAGE FORM ONLY');
    expect(prompt).toContain('incomplete/fragment sentences');
    expect(prompt).toContain('STRICTLY FORBIDDEN in hints');
  });

  it('is shared by concrete LlmService implementations', () => {
    const mock = new MockLlmService();
    const prompt = mock.buildSystemPrompt(interviewScenario);
    expect(prompt).toContain('Stay in character');
  });
});
