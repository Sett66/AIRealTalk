import { NativeModules } from 'react-native';
import type {
  PronunciationAuthorizeResponse,
  PronunciationSubmitPayload,
  SessionReport,
} from '@airealtalk/shared';
import { API_BASE_URL } from '../config';
import type { CachedTurnAudio } from '../stores/turn-audio-store';

type PronunciationEngineNative = {
  isAvailable: () => Promise<boolean>;
  evaluateSentence: (
    applicationId: string,
    userId: string,
    timestamp: string,
    sig: string,
    connectId: string,
    warrantId: string,
    refText: string,
    wavPath: string,
    expireAt: number,
  ) => Promise<number>;
};

const PronunciationEngine = NativeModules.PronunciationEngine as
  | PronunciationEngineNative
  | undefined;

export async function fetchBackendHealth(): Promise<{
  useMockPronunciation: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('无法获取 backend 健康状态');
  }

  const payload = (await response.json()) as {
    useMockPronunciation?: boolean;
  };

  return {
    useMockPronunciation: payload.useMockPronunciation !== false,
  };
}

export async function fetchAuthorize(): Promise<PronunciationAuthorizeResponse> {
  const response = await fetch(`${API_BASE_URL}/pronunciation/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'airealtalk-mobile' }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '发音评测授权失败');
  }

  return response.json() as Promise<PronunciationAuthorizeResponse>;
}

export async function isPronunciationEngineAvailable(): Promise<boolean> {
  if (PronunciationEngine?.isAvailable == null) {
    return false;
  }
  return PronunciationEngine.isAvailable();
}

function computePronunciationAvg(
  sentenceScores: Array<{ text: string; score: number }>,
): number {
  if (sentenceScores.length === 0) {
    return 0;
  }

  return Math.round(
    sentenceScores.reduce((sum, item) => sum + item.score, 0) /
      sentenceScores.length,
  );
}

export async function evaluateTurns(
  turns: CachedTurnAudio[],
  _auth?: PronunciationAuthorizeResponse,
): Promise<PronunciationSubmitPayload> {
  if (!PronunciationEngine?.evaluateSentence) {
    throw new Error('发音评测原生模块不可用');
  }

  const sentenceScores: Array<{ text: string; score: number }> = [];
  const auth = _auth ?? (await fetchAuthorize());
  console.log(
    `[pronunciation] batch start turns=${turns.length} warrant=${auth.warrantId.slice(0, 8)}...`,
  );

  for (const [index, turn] of turns.entries()) {
    console.log(`[pronunciation] evaluating turn ${index + 1}/${turns.length}`);
    try {
      const score = await PronunciationEngine.evaluateSentence(
        auth.applicationId,
        auth.userId,
        auth.timestamp,
        auth.sig,
        auth.connectId,
        auth.warrantId,
        turn.text,
        turn.wavPath,
        auth.expireAt,
      );
      sentenceScores.push({ text: turn.text, score });
      console.log(`[pronunciation] turn ${index + 1} score=${score}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '发音评测失败';
      console.warn(`[pronunciation] turn ${index + 1} failed: ${message}`);
      throw new Error(`第 ${index + 1} 句评测失败: ${message}`);
    }
  }

  return {
    pronunciationAvg: computePronunciationAvg(sentenceScores),
    sentenceScores,
  };
}

export function mergePronunciationIntoReport(
  report: SessionReport,
  payload: PronunciationSubmitPayload,
): SessionReport {
  return {
    ...report,
    pronunciationAvg: payload.pronunciationAvg,
    sentenceScores: payload.sentenceScores,
  };
}

export async function evaluateAndBuildSubmitPayload(
  turns: CachedTurnAudio[],
): Promise<PronunciationSubmitPayload | null> {
  if (turns.length === 0 || !(await isPronunciationEngineAvailable())) {
    return null;
  }

  return evaluateTurns(turns);
}
