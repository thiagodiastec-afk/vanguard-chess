import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const port = await reservePort();
const child = spawn(process.execPath, ['dist/server.cjs'], {
  cwd: projectRoot,
  windowsHide: true,
  env: {
    PATH: process.env.PATH,
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    NODE_ENV: 'production',
    PORT: String(port),
    FIRESTORE_DATABASE_ID: 'demo-vanguard-chess'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk; });
child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk; });

try {
  await waitForServer(child, port);
  const page = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(page.status, 200, 'Production server should serve the built application');

  const protectedRoutes = [
    '/api/profile/bootstrap',
    '/api/analyze',
    '/api/move',
    '/api/chat/send',
    '/api/game/chat/send',
    '/api/game/invite/create',
    '/api/game/invite/join',
    '/api/game/match',
    '/api/challenge/create',
    '/api/challenge/accept',
    '/api/game/action',
    '/api/store/purchase',
    '/api/payment/create-preference'
  ];

  for (const route of protectedRoutes) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(5_000)
    });
    assert.equal(response.status, 401, `${route} must reject requests without Firebase authentication`);
  }

  const webhook = await fetch(`http://127.0.0.1:${port}/api/payment/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'payment', data: { id: '123456' } }),
    signal: AbortSignal.timeout(5_000)
  });
  assert.equal(webhook.status, 401, 'Payment webhook must reject unsigned requests');

  for (const route of ['/api/game-end', '/api/reward-ad']) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(5_000)
    });
    assert.equal(response.status, 503, `${route} must stay disabled until server-verified rewards are implemented`);
  }
  console.log(`Production server smoke test: PASS (${protectedRoutes.length} protected routes return 401; unsigned webhook 401; game/ad rewards 503).`);
} catch (error) {
  if (output.trim()) process.stderr.write(output);
  throw error;
} finally {
  await stopServer(child);
}

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port: freePort } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return freePort;
}

async function waitForServer(serverProcess, serverPort) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Production server exited with code ${serverProcess.exitCode}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${serverPort}/`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
      lastError = new Error(`Unexpected startup response: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Production server did not become ready: ${lastError?.message || 'startup timed out'}`);
}

async function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  const exited = once(serverProcess, 'exit');
  serverProcess.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3_000))]);
  if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill('SIGKILL');
    await once(serverProcess, 'exit');
  }
}
