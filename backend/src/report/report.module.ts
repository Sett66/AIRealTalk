import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepSeekReportService } from './deepseek-report.service';
import { MockReportService } from './mock-report.service';
import { ReportService } from './report.service';

@Module({
  providers: [
    MockReportService,
    DeepSeekReportService,
    {
      provide: ReportService,
      useFactory: (
        config: ConfigService,
        mockReport: MockReportService,
        deepseekReport: DeepSeekReportService,
      ) => {
        const useMock = config.get<string>('USE_MOCK_LLM') === 'true';
        return useMock ? mockReport : deepseekReport;
      },
      inject: [ConfigService, MockReportService, DeepSeekReportService],
    },
  ],
  exports: [ReportService],
})
export class ReportModule {}
