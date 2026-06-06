import { Injectable, Logger } from '@nestjs/common';
import { AsrService } from './asr.service';
import type { AsrTranscriptionResult } from './asr.types';

const MOCK_FINAL_TEXT = "I'd like a coffee please";
const MOCK_PARTIALS = ["I'd like", "I'd like a coffee"];

@Injectable()
export class MockAsrService extends AsrService {
  private readonly logger = new Logger(MockAsrService.name);

  async transcribe(pcmBuffer: Buffer): Promise<AsrTranscriptionResult> {
    this.logger.log(`Mock ASR transcribing ${pcmBuffer.length} bytes`);
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      partials: MOCK_PARTIALS,
      final: MOCK_FINAL_TEXT,
    };
  }
}
