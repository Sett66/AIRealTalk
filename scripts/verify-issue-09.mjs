/**
 * Mock pipeline verification: session:end → report with pronunciation scores
 * Run backend with:
 *   USE_MOCK_ASR=true USE_MOCK_LLM=true USE_MOCK_TTS=true USE_MOCK_PRONUNCIATION=true pnpm --filter @airealtalk/backend start:dev
 */
import WebSocket from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://localhost:3000';
const FAKE_AUDIO = Buffer.alloc(3200, 1).toString('base64');

function send(ws, type, payload) {
  ws.send(JSON.stringify({ type, payload }));
}

function waitFor(ws, predicate, timeoutMs = 15000) {
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

const ws = new WebSocket(WS_URL);

ws.on('open', async () => {
  try {
    send(ws, 'session:connect', { scenarioId: 'interview' });
    await waitFor(ws, (e) => e.type === 'tts:end');

    send(ws, 'audio:start', {});
    send(ws, 'audio:chunk', { data: FAKE_AUDIO });
    send(ws, 'audio:end', {});

    await waitFor(ws, (e) => e.type === 'tts:end');

    send(ws, 'session:end', {});

    const reportEvent = await waitFor(ws, (e) => e.type === 'report:ready');
    const report = reportEvent.payload.report;

    if (report.pronunciationAvg === undefined) {
      throw new Error('report missing pronunciationAvg');
    }
    if (!report.sentenceScores?.length) {
      throw new Error('report missing sentenceScores');
    }

    console.log(`✓ pronunciationAvg=${report.pronunciationAvg}`);
    console.log(`✓ sentenceScores=${report.sentenceScores.length} entries`);
    console.log('✓ issue-09 mock verification passed');
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
