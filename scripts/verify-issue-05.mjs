/**
 * Issue #05 verification: opening line + multi-turn interview context
 * Run backend with:
 *   USE_MOCK_ASR=true USE_MOCK_LLM=true USE_MOCK_TTS=true pnpm --filter @airealtalk/backend start:dev
 */
import WebSocket from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://localhost:3000';
const FAKE_AUDIO = Buffer.alloc(3200, 1).toString('base64');
const TURNS = Number(process.env.TURNS ?? 3);

function send(ws, type, payload) {
  ws.send(JSON.stringify({ type, payload }));
}

function waitFor(ws, predicate, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timeout waiting for event'));
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

async function runTurn(ws, turn) {
  send(ws, 'audio:start', {});
  send(ws, 'audio:chunk', { data: FAKE_AUDIO });
  send(ws, 'audio:end', {});

  const asr = await waitFor(ws, (e) => e.type === 'asr:final');
  console.log(`✓ turn ${turn} asr:final: "${asr.payload.text}"`);

  const ttsStart = await waitFor(ws, (e) => e.type === 'tts:start');
  console.log(`✓ turn ${turn} tts:start: "${ttsStart.payload.reply.slice(0, 60)}..."`);

  await waitFor(ws, (e) => e.type === 'tts:end');
  console.log(`✓ turn ${turn} tts:end`);
}

const ws = new WebSocket(WS_URL);
const startedAt = Date.now();

ws.on('open', async () => {
  try {
    const openingPromise = waitFor(
      ws,
      (e) =>
        e.type === 'tts:start' &&
        e.payload.reply?.includes('about yourself'),
    );
    send(ws, 'session:connect', { scenarioId: 'interview' });

    const opening = await openingPromise;
    console.log(`✓ opening tts:start: "${opening.payload.reply}"`);

    await waitFor(ws, (e) => e.type === 'tts:end');
    console.log('✓ opening tts:end received');

    for (let turn = 1; turn <= TURNS; turn += 1) {
      await runTurn(ws, turn);
    }

    console.log(`✓ ${TURNS}-turn interview loop complete in ${Date.now() - startedAt}ms`);
    ws.close();
    process.exit(0);
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
