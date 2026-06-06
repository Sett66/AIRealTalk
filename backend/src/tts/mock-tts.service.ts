import { Injectable, Logger } from '@nestjs/common';
import { chunkPcmForStreaming } from './audio-chunker';
import { TtsService, type TtsChunkHandler } from './tts.service';

const SAMPLE_RATE = 16000;

function generateTonePcm(durationMs: number): Buffer {
  const numSamples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const buffer = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, i / 400, (numSamples - i) / 400);
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.25 * envelope;
    buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
  }

  return buffer;
}

@Injectable()
export class MockTtsService extends TtsService {
  private readonly logger = new Logger(MockTtsService.name);

  async synthesize(text: string, onChunk: TtsChunkHandler): Promise<void> {
    const durationMs = Math.min(3000, Math.max(600, text.length * 55));
    this.logger.log(`Mock TTS synthesizing ${durationMs}ms for: "${text}"`);

    await new Promise((resolve) => setTimeout(resolve, 80));

    const pcm = generateTonePcm(durationMs);
    const chunks = chunkPcmForStreaming(pcm);

    for (const chunk of chunks) {
      onChunk(chunk);
    }
  }
}
