import { createHash, randomBytes } from 'crypto';
import axios from 'axios';

const AUTHORIZE_URL = 'https://api.cloud.ssapi.cn/auth/authorize';

export interface AuthorizeResult {
  warrantId: string;
  expireAt: number;
  applicationId: string;
  userId: string;
  timestamp: string;
  sig: string;
  connectId: string;
}

interface AuthorizeResponse {
  code?: number;
  message?: string;
  msg?: string;
  data?: {
    warrant_id?: string;
    expire_at?: number;
  };
}

function createObjectId(): string {
  return randomBytes(12).toString('hex');
}

function createConnectSig(
  applicationId: string,
  timestamp: string,
  secret: string,
): string {
  return createHash('sha1')
    .update(`${applicationId}${timestamp}${secret}`)
    .digest('hex');
}

function createAuthorizeSign(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const query = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
  return createHash('md5').update(query).digest('hex');
}

export async function fetchWarrantId(
  appId: string,
  appSecret: string,
  userId: string,
  userClientIp = '127.0.0.1',
): Promise<AuthorizeResult> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const requestSign = createAuthorizeSign({
    app_secret: appSecret,
    appid: appId,
    timestamp,
    user_client_ip: userClientIp,
    user_id: userId,
  });

  const body = new URLSearchParams({
    appid: appId,
    timestamp,
    user_id: userId,
    user_client_ip: userClientIp,
    request_sign: requestSign,
    warrant_available: '7200',
  });

  const response = await axios.post<AuthorizeResponse>(
    AUTHORIZE_URL,
    body.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15_000,
    },
  );

  if (response.data.code !== 0 || !response.data.data?.warrant_id) {
    throw new Error(
      response.data.message ??
        response.data.msg ??
        '阿里云口语评测授权失败',
    );
  }

  return {
    warrantId: response.data.data.warrant_id,
    expireAt: response.data.data.expire_at ?? 0,
    applicationId: appId,
    userId,
    timestamp,
    sig: createConnectSig(appId, timestamp, appSecret),
    connectId: createObjectId(),
  };
}
