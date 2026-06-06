import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AliyunAsrService } from './aliyun-asr.service';
import { AliyunTokenService } from './aliyun-token.service';
import { AsrService } from './asr.service';
import { MockAsrService } from './mock-asr.service';

@Module({
  providers: [
    AliyunTokenService,
    MockAsrService,
    AliyunAsrService,
    {
      provide: AsrService,
      useFactory: (
        config: ConfigService,
        mockAsr: MockAsrService,
        aliyunAsr: AliyunAsrService,
      ) => {
        const useMock = config.get<string>('USE_MOCK_ASR') === 'true';
        return useMock ? mockAsr : aliyunAsr;
      },
      inject: [ConfigService, MockAsrService, AliyunAsrService],
    },
  ],
  exports: [AsrService],
})
export class AsrModule {}
