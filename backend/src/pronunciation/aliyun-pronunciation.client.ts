import { createHash, randomBytes } from 'crypto';
import WebSocket from 'ws';
import axios from 'axios';
import { wrapPcmInWav } from '../asr/pcm-to-wav';

const AUTHORIZE_URL = 'https://api.cloud.ssapi.cn/auth/authorize';
const WS_URL = 'wss://api.cloud.ssapi.cn';

const SDK_INFO = {
  os: 'node',
  product: 'airealtalk',
  source: 7,
  protocol: 1,
  os_version: process.version,
  arch: process.arch,
  version: 1,
};

interface AuthorizeResponse {
  code?: number;
  message?: string;
  msg?: string;
  data?: {
    warrant_id?: string;
    expire_at?: number;
  };
}

interface EvaluationResponse {
  result?: {
    pron?: number;
    overall?: number;
    accuracy?: number;
  };
  errorId?: number;
  errId?: number;
  errMsg?: string;
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

async function fetchWarrantId(
  appId: string,
  appSecret: string,
  userId: string,
): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const userClientIp = '127.0.0.1';
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

  return response.data.data.warrant_id;
}

function waitForMessage(
  ws: WebSocket,
  predicate: (payload: EvaluationResponse) => boolean,
  timeoutMs: number,
): Promise<EvaluationResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('阿里云口语评测超时'));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const payload = JSON.parse(String(raw)) as EvaluationResponse;
        if (predicate(payload)) {
          cleanup();
          resolve(payload);
        }
      } catch {
        // ignore non-json frames
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    };

    ws.on('message', onMessage);
    ws.on('error', onError);
  });
}

export async function evaluateSentenceWithAliyun(
  appId: string,
  appSecret: string,
  refText: string,
  pcmBuffer: Buffer,
): Promise<number> {
  const userId = 'airealtalk-backend';
  const warrantId = await fetchWarrantId(appId, appSecret, userId);
  const wavBuffer = wrapPcmInWav(pcmBuffer);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createConnectSig(appId, timestamp, appSecret);
  const connectId = createObjectId();
  const tokenId = createObjectId();
  const requestId = createObjectId();

  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket 连接超时')), 10_000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  try {
    ws.send(
      JSON.stringify({
        cmd: 'connect',
        param: {
          app: {
            applicationId: appId,
            timestamp,
            sig,
            userId,
            connect_id: connectId,
            warrantId,
          },
          sdk: SDK_INFO,
        },
      }),
    );

    await waitForMessage(
      ws,
      (payload) => Boolean(payload.result) || Boolean(payload.errorId ?? payload.errId),
      8_000,
    ).catch(() => undefined);

    ws.send(
      JSON.stringify({
        cmd: 'start',
        param: {
          app: {
            applicationId: appId,
            timestamp,
            sig,
            userId,
            connect_id: connectId,
            warrantId,
          },
          audio: {
            sampleBytes: 2,
            audioType: 'wav',
            sampleRate: 16000,
            channel: 1,
          },
          request: {
            request_id: requestId,
            tokenId,
            coreType: 'en.sent.score',
            refText,
            rank: 100,
          },
        },
      }),
    );

    const chunkSize = 8_192;
    for (let offset = 0; offset < wavBuffer.length; offset += chunkSize) {
      const chunk = wavBuffer.subarray(offset, offset + chunkSize);
      ws.send(
        JSON.stringify({
          cmd: 'feed',
          data: chunk.toString('base64'),
          param: {
            app: {
              applicationId: appId,
              timestamp,
              sig,
              userId,
              connect_id: connectId,
            },
          },
        }),
      );
    }

    ws.send(JSON.stringify({ cmd: 'stop' }));

    const resultMessage = await waitForMessage(
      ws,
      (payload) =>
        payload.result?.pron !== undefined ||
        payload.result?.overall !== undefined ||
        payload.result?.accuracy !== undefined ||
        Boolean(payload.errorId ?? payload.errId),
      15_000,
    );

    const errorId = resultMessage.errorId ?? resultMessage.errId;
    if (errorId) {
      throw new Error(
        resultMessage.errMsg ?? `阿里云口语评测失败 (${String(errorId)})`,
      );
    }

    const score =
      resultMessage.result?.pron ??
      resultMessage.result?.accuracy ??
      resultMessage.result?.overall;

    if (score === undefined) {
      throw new Error('阿里云口语评测未返回分数');
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  } finally {
    ws.close();
  }
}
