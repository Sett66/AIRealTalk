/**
 * Mock pipeline verification: audio:end → ASR → LLM → TTS
 * Run backend with:
 *   USE_MOCK_ASR=true USE_MOCK_LLM=true USE_MOCK_TTS=true pnpm --filter @airealtalk/backend start:dev
 */
import WebSocket from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://localhost:3000';
const FAKE_AUDIO = Buffer.alloc(3200, 1).toString('base64');

function send(ws, type, payload) {
  ws.send(JSON.stringify({ type, payload }));
}

function waitFor(ws, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timeout waiting for event`));
    }, timeoutMs);

    function onMessage(raw) {
      const event = JSON.parse(String(raw));
      if (predicate(event)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(event);
      }
    }

    ws.on('message', onMessage);
  });
}

const ws = new WebSocket(WS_URL);
const startedAt = Date.now();
let ttsStartAt = 0;
let ttsChunkCount = 0;

ws.on('open', async () => {
  try {
    send(ws, 'session:connect', { scenarioId: 'interview' });
    await waitFor(ws, (e) => e.type === 'tts:end');
    console.log('✓ opening tts:end received');

    send(ws, 'audio:start', {});
    send(ws, 'audio:chunk', { data: FAKE_AUDIO });
    send(ws, 'audio:end', {});

    await waitFor(ws, (e) => e.type === 'asr:final');
    console.log('✓ asr:final received');

    await waitFor(ws, (e) => e.type === 'tts:start');
    ttsStartAt = Date.now();
    console.log(`✓ tts:start received (${ttsStartAt - startedAt}ms from start)`);

    ws.on('message', (raw) => {
      const event = JSON.parse(String(raw));
      if (event.type === 'tts:chunk') {
        ttsChunkCount += 1;
        if (ttsChunkCount === 1) {
          console.log(
            `✓ first tts:chunk received (${Date.now() - ttsStartAt}ms after tts:start)`,
          );
        }
      }
      if (event.type === 'tts:end') {
        console.log(`✓ tts:end received (${ttsChunkCount} chunks total)`);
        console.log(`✓ pipeline complete in ${Date.now() - startedAt}ms`);
        ws.close();
        process.exit(0);
      }
    });
  } catch (error) {
    console.error('✗', error.message);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error.message);
  process.exit(1);
});
