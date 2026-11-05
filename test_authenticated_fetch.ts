import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthenticatedFetch } from './src/lib/authenticatedFetch';
const origin = 'https://chess.example';
const user = () => ({ uid: 'alice', async getIdToken() { return 'id-fixture'; } });
test('external, credentialed and non-API URLs cannot retrieve or transmit credentials', async () => {
  let reads = 0; let sends = 0;
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => ({ uid: 'alice', async getIdToken() { reads++; return 'fixture'; } }),
    fetch: async () => { sends++; return new Response(); } });
  for (const target of ['https://evil.example/api/move', '//evil.example/api/move', '/settings', 'https://u:p@chess.example/api/move']) {
    await assert.rejects(() => fetcher(target));
  }
  assert.equal(reads, 0); assert.equal(sends, 0);
});
test('uses redirect error mode and preserves caller body and headers', async () => {
  const current = user();
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async (input, init) => {
    const request = new Request(input, init);
    assert.equal(request.url, 'https://chess.example/api/move');
    assert.equal(request.redirect, 'error'); assert.equal(await request.text(), '{"move":"e4"}');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer id-fixture');
    assert.equal(headers.get('content-type'), 'application/json');
    return new Response('ok');
  }});
  assert.equal(await (await fetcher('/api/move', { method: 'POST', body: '{"move":"e4"}', headers: { 'content-type': 'application/json' } })).text(), 'ok');
});
test('does not send after sign-out during token retrieval', async () => {
  let current: any = { uid: 'alice', async getIdToken() { current = null; return 'fixture'; } };
  let sends = 0;
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async () => { sends++; return new Response(); } });
  await assert.rejects(() => fetcher('/api/move')); assert.equal(sends, 0);
});
test('revoked sessions do not trigger token refresh or request replay', async () => {
  let reads = 0; let sends = 0;
  const current = { uid: 'alice', async getIdToken() { reads++; return 'fixture'; } };
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async () => { sends++; return Response.json({ code: 'AUTH_REAUTHENTICATION_REQUIRED' }, { status: 401 }); } });
  const response = await fetcher('/api/move'); assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'AUTH_REAUTHENTICATION_REQUIRED');
  assert.equal(reads, 1); assert.equal(sends, 1);
});
test('expired token refresh is bounded to one replay', async () => {
  const reads: boolean[] = []; let sends = 0;
  const current = { uid: 'alice', async getIdToken(force = false) { reads.push(force); return 'fixture'; } };
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async () => { sends++; return Response.json({ code: 'AUTH_TOKEN_EXPIRED' }, { status: 401 }); } });
  assert.equal((await fetcher('/api/move')).status, 401);
  assert.deepEqual(reads, [false, true]); assert.equal(sends, 2);
});
test('App Check token is attached when available, failure remains nonblocking', async () => {
  for (const available of [true, false]) {
    const current = user();
    const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current,
      getAppCheckToken: async () => { if (!available) throw new Error('provider unavailable'); return 'app-check-fixture'; },
      fetch: async (_, init) => { assert.equal(new Headers(init?.headers).get('X-Firebase-AppCheck'), available ? 'app-check-fixture' : null); return new Response(); }
    });
    assert.equal((await fetcher('/api/move')).status, 200);
  }
});

test('Request input retains body on the single expired-token retry', async () => {
  const current = user(); let sends = 0;
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async (input, init) => {
    const request = new Request(input, init); assert.equal(await request.text(), 'fixture-body');
    return ++sends === 1 ? Response.json({ code: 'AUTH_TOKEN_EXPIRED' }, { status: 401 }) : new Response('ok');
  }});
  const response = await fetcher(new Request(origin + '/api/move', { method: 'POST', body: 'fixture-body' }));
  assert.equal(response.status, 200); assert.equal(sends, 2);
});
test('a new session for the same uid cannot receive a replay', async () => {
  const first = user(); let current = first; let sends = 0;
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current, fetch: async () => {
    sends++; current = user(); return new Response('', { status: 401 });
  }});
  assert.equal((await fetcher('/api/move')).status, 401); assert.equal(sends, 1);
});
test('session change while awaiting App Check prevents transmission', async () => {
  let current: ReturnType<typeof user> | null = user(); let sends = 0;
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current,
    getAppCheckToken: async () => { current = null; return 'app-fixture'; },
    fetch: async () => { sends++; return new Response(); }
  });
  await assert.rejects(() => fetcher('/api/move')); assert.equal(sends, 0);
});

test('unresponsive App Check provider cannot stall a valid request', { timeout: 1000 }, async () => {
  const current = user();
  const fetcher = createAuthenticatedFetch({ origin, getCurrentUser: () => current,
    getAppCheckToken: () => new Promise(() => {}), fetch: async () => new Response('ok') });
  assert.equal((await fetcher('/api/move')).status, 200);
});
