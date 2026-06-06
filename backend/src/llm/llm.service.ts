import type { LlmTurnResponse } from '@airealtalk/shared';

export abstract class LlmService {
  abstract generateReply(userText: string): Promise<LlmTurnResponse>;
}
