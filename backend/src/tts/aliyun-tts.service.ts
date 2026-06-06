import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AliyunTokenService } from '../asr/aliyun-token.service';
import { chunkPcmForStreaming, extractPcmFromAudio } from './audio-chunker';
import { TtsService, type TtsChunkHandler } from './tts.service';

const NLS_TTS_URL =
  'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts';

@Injectable()
export class AliyunTtsService extends TtsService {
  private readonly logger = new Logger(AliyunTtsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokenService: AliyunTokenService,
  ) {
    super();
  }

  async synthesize(text: string, onChunk: TtsChunkHandler): Promise<void> {
    const appKey = this.config.get<string>('ALIYUN_NLS_APP_KEY');
    if (!appKey) {
      throw new Error('ALIYUN_NLS_APP_KEY is required');
    }

    const token = await this.tokenService.getToken();

    this.logger.log(`Aliyun TTS synthesizing ${text.length} chars`);

    const response = await axios.post(
      NLS_TTS_URL,
      {
        appkey: appKey,
        text,
        format: 'wav',
        sample_rate: 16000,
        voice: 'cally',
        volume: 50,
        speech_rate: 80,
        pitch_rate: 0,
      },
      {
        headers: {
          'X-NLS-Token': token,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
        responseType: 'arraybuffer',
      },
    );

    const audioBuffer = Buffer.from(response.data);
    if (audioBuffer.length === 0) {
      throw new Error('Aliyun TTS returned empty audio');
    }

    const pcm = extractPcmFromAudio(audioBuffer);
    const chunks = chunkPcmForStreaming(pcm);
    for (const chunk of chunks) {
      onChunk(chunk);
    }
  }
}
