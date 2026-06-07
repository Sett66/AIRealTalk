import { Injectable, Logger } from '@nestjs/common';
import { PronunciationService } from './pronunciation.service';
import type { PronunciationResult, TurnAudio } from './pronunciation.types';

function mockScoreForText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return 68 + (hash % 28);
}

@Injectable()
export class MockPronunciationService extends PronunciationService {
  private readonly logger = new Logger(MockPronunciationService.name);

  async evaluateSession(turns: TurnAudio[]): Promise<PronunciationResult> {
    this.logger.log(`Mock pronunciation evaluating ${turns.length} turns`);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const sentenceScores = turns.map((turn) => ({
      text: turn.text,
      score: mockScoreForText(turn.text),
    }));

    const pronunciationAvg =
      sentenceScores.length === 0
        ? 0
        : Math.round(
            sentenceScores.reduce((sum, item) => sum + item.score, 0) /
              sentenceScores.length,
          );

    return { pronunciationAvg, sentenceScores };
  }
}
