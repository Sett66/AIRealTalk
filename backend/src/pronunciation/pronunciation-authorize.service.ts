import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PronunciationAuthorizeResponse } from '@airealtalk/shared';
import { fetchWarrantId } from './aliyun-authorize.client';

@Injectable()
export class PronunciationAuthorizeService {
  constructor(private readonly config: ConfigService) {}

  async authorize(userId?: string): Promise<PronunciationAuthorizeResponse> {
    const applicationId = (
      this.config.get<string>('ALIYUN_PRONUNCIATION_APP_ID') ??
      this.config.get<string>('ALIYUN_NLS_APP_KEY') ??
      ''
    ).trim();
    const appSecret = (
      this.config.get<string>('ALIYUN_PRONUNCIATION_APP_SECRET') ?? ''
    ).trim();

    if (!applicationId || !appSecret) {
      throw new Error(
        'ALIYUN_PRONUNCIATION_APP_ID 与 ALIYUN_PRONUNCIATION_APP_SECRET 为口语评测必填项',
      );
    }

    const resolvedUserId = (userId ?? 'airealtalk-mobile').trim();
    const authorized = await fetchWarrantId(
      applicationId,
      appSecret,
      resolvedUserId,
    );

    return {
      warrantId: authorized.warrantId,
      expireAt: authorized.expireAt,
      applicationId: authorized.applicationId,
      userId: authorized.userId,
      timestamp: authorized.timestamp,
      sig: authorized.sig,
      connectId: authorized.connectId,
    };
  }
}
