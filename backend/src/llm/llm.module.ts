import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepSeekLlmService } from './deepseek-llm.service';
import { LlmService } from './llm.service';
import { MockLlmService } from './mock-llm.service';

@Module({
  providers: [
    MockLlmService,
    DeepSeekLlmService,
    {
      provide: LlmService,
      useFactory: (
        config: ConfigService,
        mockLlm: MockLlmService,
        deepseekLlm: DeepSeekLlmService,
      ) => {
        const useMock = config.get<string>('USE_MOCK_LLM') === 'true';
        return useMock ? mockLlm : deepseekLlm;
      },
      inject: [ConfigService, MockLlmService, DeepSeekLlmService],
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
