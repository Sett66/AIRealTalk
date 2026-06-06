import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@airealtalk/shared';
import { HealthResponseSchema } from '@airealtalk/shared';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): HealthResponse {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
    return HealthResponseSchema.parse(response);
  }
}
