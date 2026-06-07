/**
 * Issue #10 static checks: no API keys in mobile, reconnect/timeout config
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

const secretPatterns = [
  /sk-[a-zA-Z0-9]{10,}/,
  /LTAI[a-zA-Z0-9]+/,
  /DEEPSEEK_API_KEY\s*=/,
  /ALIYUN_NLS_APP_KEY\s*=/,
];

function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function grepMobileSources() {
  const mobileRoot = join(root, 'mobile');
  const files = [
    ...collectSourceFiles(join(mobileRoot, 'src')),
    join(mobileRoot, 'App.tsx'),
  ].filter((file) => statSync(file).isFile());

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const rel = file.replace(`${root}\\`, '').replace(`${root}/`, '');
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        throw new Error(`Possible secret in mobile source: ${rel}`);
      }
    }
  }
}

function assertReconnectBackoff() {
  const wsHook = readFileSync(join(root, 'mobile/src/hooks/useWebSocket.ts'), 'utf8');
  if (!wsHook.includes('MAX_RECONNECT_ATTEMPTS = 5')) {
    throw new Error('useWebSocket missing MAX_RECONNECT_ATTEMPTS = 5');
  }
  if (!wsHook.includes('2 ** (nextAttempt - 1)')) {
    throw new Error('useWebSocket missing exponential backoff');
  }
}

function assertLlmTimeout() {
  const llm = readFileSync(join(root, 'backend/src/llm/deepseek-llm.service.ts'), 'utf8');
  if (!llm.includes('timeout: 20_000')) {
    throw new Error('deepseek-llm.service.ts missing 20s timeout');
  }
}

function assertAsrTimeout() {
  const asr = readFileSync(join(root, 'backend/src/asr/aliyun-asr.service.ts'), 'utf8');
  if (!asr.includes('timeout: 15_000')) {
    throw new Error('aliyun-asr.service.ts missing 15s timeout');
  }
}

function assertMicGuide() {
  const guide = readFileSync(
    join(root, 'mobile/src/components/MicPermissionGuide.tsx'),
    'utf8',
  );
  if (!guide.includes('openSettings')) {
    throw new Error('MicPermissionGuide missing openSettings');
  }
}

try {
  grepMobileSources();
  assertReconnectBackoff();
  assertLlmTimeout();
  assertAsrTimeout();
  assertMicGuide();
  console.log('✓ mobile 目录无 API Key 泄露');
  console.log('✓ WS 指数退避重连（最多 5 次）');
  console.log('✓ ASR 15s / LLM 20s 超时配置');
  console.log('✓ 麦克风权限引导页');
  console.log('✓ issue-10 static verification passed');
} catch (error) {
  console.error('✗', error instanceof Error ? error.message : error);
  process.exit(1);
}
