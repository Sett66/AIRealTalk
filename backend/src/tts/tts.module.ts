import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsrModule } from '../asr/asr.module';
import { AliyunTtsService } from './aliyun-tts.service';
import { MockTtsService } from './mock-tts.service';
import { TtsService } from './tts.service';

@Module({
  imports: [AsrModule],
  providers: [
    MockTtsService,
    AliyunTtsService,
    {
      provide: TtsService,
      useFactory: (
        config: ConfigService,
        mockTts: MockTtsService,
        aliyunTts: AliyunTtsService,
      ) => {
        const useMock = config.get<string>('USE_MOCK_TTS') === 'true';
        return useMock ? mockTts : aliyunTts;
      },
      inject: [ConfigService, MockTtsService, AliyunTtsService],
    },
  ],
  exports: [TtsService],
})
export class TtsModule {}
