/**
 * Verify pronunciation authorize credentials (secret/app id).
 * Usage: node scripts/test-pronunciation-authorize.mjs
 */
const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';

async function main() {
  const health = await fetch(`${API_BASE}/health`).then((r) => r.json());
  console.log('health:', health);

  const response = await fetch(`${API_BASE}/pronunciation/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'airealtalk-test' }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error('authorize FAILED:', response.status, text);
    process.exit(1);
  }

  const payload = JSON.parse(text);
  console.log('authorize OK:');
  console.log('  applicationId:', payload.applicationId);
  console.log('  warrantId:', `${String(payload.warrantId).slice(0, 8)}...`);
  console.log('  expireAt:', payload.expireAt);
  console.log('  connectId:', payload.connectId);
  console.log('If you see this, app_id/secret are valid. Failures are on mobile WebSocket eval.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
