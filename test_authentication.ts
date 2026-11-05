import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuthenticator } from './src/lib/serverAuthentication';

function response() {
  return { statusCode: 200, body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; } };
}
const request = (authorization: string) => ({ get: () => authorization });
for (const code of ['auth/id-token-revoked', 'auth/user-disabled']) {
  test(`rejects ${code} even while the ID token signature is valid`, async () => {
    const authenticate = createAuthenticator(() => ({
      async verifyIdToken(_token, checkRevoked) {
        if (checkRevoked) throw Object.assign(new Error('sensitive-sdk-details'), { code });
        return { uid: 'alice' };
      }
    }));
    const res = response();
    assert.equal(await authenticate(request('Bearer fixture'), res), null);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'AUTH_REAUTHENTICATION_REQUIRED');
  });
}
test('returns verified identity and explicitly checks revocation', async () => {
  const authenticate = createAuthenticator(() => ({ async verifyIdToken(token, revoked) {
    assert.equal(token, 'fixture'); assert.equal(revoked, true); return { uid: 'alice' };
  }}));
  assert.equal(await authenticate(request('Bearer fixture'), response()), 'alice');
});
test('missing and malformed credentials never initialize Admin', async () => {
  let initializations = 0;
  const authenticate = createAuthenticator(() => { initializations++; throw new Error('must not initialize'); });
  for (const header of ['', 'Basic fixture', 'Bearer ', 'Bearer a b']) {
    const res = response();
    assert.equal(await authenticate(request(header), res), null);
    assert.equal(res.statusCode, 401);
  }
  assert.equal(initializations, 0);
});
test('expired ID tokens permit one refresh', async () => {
  const authenticate = createAuthenticator(() => ({ async verifyIdToken() {
    throw Object.assign(new Error('sensitive'), { code: 'auth/id-token-expired' });
  }}));
  const res = response(); await authenticate(request('Bearer fixture'), res);
  assert.equal(res.statusCode, 401); assert.equal(res.body.code, 'AUTH_TOKEN_EXPIRED');
});
test('unavailable configuration fails closed', async () => {
  const authenticate = createAuthenticator(() => { throw new Error('FIREBASE_SERVICE_ACCOUNT_MISSING'); });
  const res = response(); assert.equal(await authenticate(request('Bearer fixture'), res), null);
  assert.equal(res.statusCode, 503);
});

for (const outcome of ['missing', 'valid', 'invalid']) {
  test(`App Check monitoring records ${outcome} without blocking valid Auth`, async () => {
    const observations: string[] = [];
    const authenticate = createAuthenticator(() => ({ async verifyIdToken() { return { uid: 'alice' }; } }), {
      async verify(token: string) { assert.equal(token, 'app-fixture'); if (outcome === 'invalid') throw new Error('sensitive'); },
      report(value: string) { observations.push(value); }
    });
    const req = { get: (name: string) => name === 'authorization' ? 'Bearer fixture' : outcome === 'missing' ? undefined : 'app-fixture' };
    const res = response();
    assert.equal(await authenticate(req, res), 'alice'); assert.equal(res.statusCode, 200);
    assert.deepEqual(observations, [outcome]);
  });
}
test('default mode ignores App Check and never rejects authenticated callers', async () => {
  const authenticate = createAuthenticator(() => ({ async verifyIdToken() { return { uid: 'alice' }; } }));
  assert.equal(await authenticate(request('Bearer fixture'), response()), 'alice');
});

test('SDK error details and token contents never reach logs or responses', async () => {
  const logs: unknown[] = []; const original = console.error;
  console.error = (...args) => { logs.push(args); };
  try {
    for (const code of ['auth/invalid-id-token', 'auth/internal-error']) {
      const authenticate = createAuthenticator(() => ({ async verifyIdToken() {
        throw Object.assign(new Error('SECRET_FIXTURE'), { code });
      }}));
      const res = response(); await authenticate(request('Bearer SECRET_FIXTURE'), res);
      assert.equal(res.statusCode, code === 'auth/internal-error' ? 503 : 401);
      assert.equal(JSON.stringify(res.body).includes('SECRET_FIXTURE'), false);
    }
    assert.deepEqual(logs, []);
  } finally { console.error = original; }
});
test('failed telemetry cannot reject a verified user', async () => {
  const authenticate = createAuthenticator(() => ({ async verifyIdToken() { return { uid: 'alice' }; } }), {
    async verify() { throw new Error('provider unavailable'); }, report() { throw new Error('logger unavailable'); }
  });
  assert.equal(await authenticate(request('Bearer fixture'), response()), 'alice');
});

test('unresponsive App Check verifier cannot stall a verified user', { timeout: 1000 }, async () => {
  const authenticate = createAuthenticator(() => ({ async verifyIdToken() { return { uid: 'alice' }; } }), {
    verify: () => new Promise(() => {}), report() {}
  });
  assert.equal(await authenticate(request('Bearer fixture'), response()), 'alice');
});
