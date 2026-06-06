import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RPCClient = require('@alicloud/pop-core').RPCClient;

interface CreateTokenResponse {
  Token?: {
    Id?: string;
    ExpireTime?: number;
  };
}

@Injectable()
export class AliyunTokenService {
  private readonly logger = new Logger(AliyunTokenService.name);
  private token: string | null = null;
  private expireAtMs = 0;

  constructor(private readonly config: ConfigService) {}

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expireAtMs - 60_000) {
      return this.token;
    }

    const accessKeyId = this.config.get<string>('ALIYUN_AK_ID');
    const accessKeySecret = this.config.get<string>('ALIYUN_AK_SECRET');

    if (!accessKeyId || !accessKeySecret) {
      throw new Error('ALIYUN_AK_ID and ALIYUN_AK_SECRET are required');
    }

    const client = new RPCClient({
      accessKeyId,
      accessKeySecret,
      endpoint: 'https://nls-meta.cn-shanghai.aliyuncs.com',
      apiVersion: '2019-02-28',
    });

    const response = (await client.request('CreateToken')) as CreateTokenResponse;
    const tokenId = response.Token?.Id;
    const expireTime = response.Token?.ExpireTime;

    if (!tokenId || !expireTime) {
      throw new Error('Failed to obtain Aliyun NLS token');
    }

    this.token = tokenId;
    this.expireAtMs = expireTime * 1000;
    this.logger.log('Aliyun NLS token refreshed');
    return tokenId;
  }
}
