import type { PronunciationResult, TurnAudio } from './pronunciation.types';

export abstract class PronunciationService {
  abstract evaluateSession(turns: TurnAudio[]): Promise<PronunciationResult>;
}
