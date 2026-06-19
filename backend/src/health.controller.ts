import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthResponse } from '@airealtalk/shared';
import { HealthResponseSchema } from '@airealtalk/shared';

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  getHealth(): HealthResponse {
    const useMockPronunciation =
      this.config.get<string>('USE_MOCK_PRONUNCIATION') !== 'false';
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      useMockPronunciation,
    };
    return HealthResponseSchema.parse(response);
  }
}
