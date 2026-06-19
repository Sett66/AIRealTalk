/**
 * @deprecated Node 直连 ssapi WebSocket 不可用；口语打分改由移动端 SingEngine SDK 执行。
 * Backend 仅通过 POST /pronunciation/authorize 下发 warrant_id。
 */
export async function evaluateSentenceWithAliyun(
  _appId: string,
  _appSecret: string,
  _refText: string,
  _pcmBuffer: Buffer,
): Promise<number> {
  throw new Error(
    '阿里云口语评测须在移动端 SDK 执行；请设置 USE_MOCK_PRONUNCIATION=true 或接入 Android PronunciationEngine',
  );
}
