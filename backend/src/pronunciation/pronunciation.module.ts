import { Module } from '@nestjs/common';
import { MockPronunciationService } from './mock-pronunciation.service';
import { PronunciationAuthorizeService } from './pronunciation-authorize.service';
import { PronunciationController } from './pronunciation.controller';
import { PronunciationService } from './pronunciation.service';

@Module({
  controllers: [PronunciationController],
  providers: [
    MockPronunciationService,
    PronunciationAuthorizeService,
    {
      provide: PronunciationService,
      useExisting: MockPronunciationService,
    },
  ],
  exports: [PronunciationService, PronunciationAuthorizeService],
})
export class PronunciationModule {}
