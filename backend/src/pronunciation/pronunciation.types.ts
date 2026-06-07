export interface TurnAudio {
  text: string;
  pcm: Buffer;
}

export interface PronunciationResult {
  pronunciationAvg: number;
  sentenceScores: Array<{ text: string; score: number }>;
}
