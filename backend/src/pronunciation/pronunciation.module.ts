import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AliyunPronunciationService } from './aliyun-pronunciation.service';
import { MockPronunciationService } from './mock-pronunciation.service';
import { PronunciationService } from './pronunciation.service';

@Module({
  providers: [
    MockPronunciationService,
    AliyunPronunciationService,
    {
      provide: PronunciationService,
      useFactory: (
        config: ConfigService,
        mock: MockPronunciationService,
        aliyun: AliyunPronunciationService,
      ) => {
        // 默认 mock：ssapi 口语评测需原生 SDK，Node 直连 WebSocket 不可用
        const useMock = config.get<string>('USE_MOCK_PRONUNCIATION') !== 'false';
        return useMock ? mock : aliyun;
      },
      inject: [ConfigService, MockPronunciationService, AliyunPronunciationService],
    },
  ],
  exports: [PronunciationService],
})
export class PronunciationModule {}
