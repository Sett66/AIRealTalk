import { Body, Controller, Logger, Post } from '@nestjs/common';
import {
  PronunciationAuthorizeRequestSchema,
  PronunciationAuthorizeResponseSchema,
  type PronunciationAuthorizeResponse,
} from '@airealtalk/shared';
import { PronunciationAuthorizeService } from './pronunciation-authorize.service';

@Controller()
export class PronunciationController {
  private readonly logger = new Logger(PronunciationController.name);

  constructor(
    private readonly pronunciationAuthorizeService: PronunciationAuthorizeService,
  ) {}

  @Post('pronunciation/authorize')
  async authorize(
    @Body() body: unknown,
  ): Promise<PronunciationAuthorizeResponse> {
    const request = PronunciationAuthorizeRequestSchema.parse(body ?? {});
    const response = await this.pronunciationAuthorizeService.authorize(
      request.userId,
    );
    this.logger.log(
      `Issued pronunciation warrant for user=${response.userId}`,
    );
    return PronunciationAuthorizeResponseSchema.parse(response);
  }
}
