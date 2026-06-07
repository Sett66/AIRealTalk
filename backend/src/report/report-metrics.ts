const PCM_SAMPLE_RATE = 16000;
const PCM_BYTES_PER_SAMPLE = 2;

export function pcmDurationSec(byteLength: number): number {
  if (byteLength <= 0) {
    return 0;
  }

  return byteLength / (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeWpm(wordCount: number, durationSec: number): number {
  if (durationSec <= 0 || wordCount <= 0) {
    return 0;
  }

  return Math.round((wordCount / durationSec) * 60);
}
