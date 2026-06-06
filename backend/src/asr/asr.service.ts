import type { AsrTranscriptionResult } from './asr.types';

export abstract class AsrService {
  abstract transcribe(pcmBuffer: Buffer): Promise<AsrTranscriptionResult>;
}
