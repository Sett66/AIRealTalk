import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { evaluateSentenceWithAliyun } from './aliyun-pronunciation.client';
import { PronunciationService } from './pronunciation.service';
import type { PronunciationResult, TurnAudio } from './pronunciation.types';

@Injectable()
export class AliyunPronunciationService extends PronunciationService {
  private readonly logger = new Logger(AliyunPronunciationService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async evaluateSession(turns: TurnAudio[]): Promise<PronunciationResult> {
    const appId = (
      this.config.get<string>('ALIYUN_PRONUNCIATION_APP_ID') ??
      this.config.get<string>('ALIYUN_NLS_APP_KEY') ??
      ''
    ).trim();
    const appSecret = (
      this.config.get<string>('ALIYUN_PRONUNCIATION_APP_SECRET') ?? ''
    ).trim();

    if (!appId || !appSecret) {
      throw new Error(
        'ALIYUN_PRONUNCIATION_APP_ID 与 ALIYUN_PRONUNCIATION_APP_SECRET 为口语评测必填项',
      );
    }

    this.logger.log(`Aliyun pronunciation evaluating ${turns.length} turns`);

    const sentenceScores: Array<{ text: string; score: number }> = [];

    for (const turn of turns) {
      const score = await evaluateSentenceWithAliyun(
        appId,
        appSecret,
        turn.text,
        turn.pcm,
      );
      sentenceScores.push({ text: turn.text, score });
      this.logger.log(`Aliyun score for "${turn.text.slice(0, 40)}": ${score}`);
    }

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
