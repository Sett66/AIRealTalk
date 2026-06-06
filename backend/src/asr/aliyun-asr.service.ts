import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AsrService } from './asr.service';
import type { AsrTranscriptionResult } from './asr.types';
import { AliyunTokenService } from './aliyun-token.service';
import { isWavBuffer, wrapPcmInWav } from './pcm-to-wav';

const NLS_ASR_URL =
  'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr';

interface AliyunAsrResponse {
  status?: number;
  result?: string;
  message?: string;
  task_id?: string;
}

function parseAsrResponse(data: unknown): AliyunAsrResponse {
  if (typeof data === 'string') {
    return JSON.parse(data) as AliyunAsrResponse;
  }
  return data as AliyunAsrResponse;
}

@Injectable()
export class AliyunAsrService extends AsrService {
  private readonly logger = new Logger(AliyunAsrService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokenService: AliyunTokenService,
  ) {
    super();
  }

  async transcribe(audioBuffer: Buffer): Promise<AsrTranscriptionResult> {
    const appKey = this.config.get<string>('ALIYUN_NLS_APP_KEY');
    if (!appKey) {
      throw new Error('ALIYUN_NLS_APP_KEY is required');
    }

    const token = await this.tokenService.getToken();

    const isWav = isWavBuffer(audioBuffer);
    const body = isWav ? audioBuffer : wrapPcmInWav(audioBuffer);
    const format = 'wav';

    this.logger.log(
      `Aliyun ASR transcribing ${audioBuffer.length} bytes (${format}, source=${isWav ? 'wav' : 'pcm'})`,
    );

    const response = await axios.post(NLS_ASR_URL, body, {
      headers: {
        'X-NLS-Token': token,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(body.length),
      },
      params: {
        appkey: appKey,
        format,
        sample_rate: 16000,
        enable_punctuation_prediction: true,
        enable_inverse_text_normalization: true,
      },
      timeout: 15_000,
      maxBodyLength: Infinity,
      responseType: 'json',
      transformResponse: [(raw) => raw],
    });

    const parsed = parseAsrResponse(response.data);
    const status = parsed.status;

    this.logger.log(
      `Aliyun ASR response status=${String(status)} resultLen=${parsed.result?.length ?? 0} message=${parsed.message ?? ''}`,
    );

    if (status !== 20000000) {
      throw new Error(
        parsed.message ?? `Aliyun ASR failed with status ${String(status)}`,
      );
    }

    const final = parsed.result?.trim() ?? '';
    if (!final) {
      throw new Error(
        'Aliyun ASR returned empty result — check audio format or speak louder',
      );
    }

    return {
      partials: [final],
      final,
    };
  }
}
