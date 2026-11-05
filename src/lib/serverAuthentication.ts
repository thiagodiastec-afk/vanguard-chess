import { withAttestationDeadline } from './attestationDeadline';

type TokenVerifier = { verifyIdToken(token: string, checkRevoked: boolean): Promise<{ uid: string }> };

/** Every API identity check rejects revoked sessions and disabled accounts. */
type AppCheckMonitor = {
  verify(token: string): Promise<void>;
  report(outcome: 'missing' | 'valid' | 'invalid'): void;
};
export function createAuthenticator(getAuth: () => TokenVerifier, monitor?: AppCheckMonitor) {
  return async (req: { get(name: string): string | undefined }, res: { status(code: number): { json(body: unknown): unknown } }) => {
    const match = (req.get('authorization') || '').match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return null;
    }
    try {
      const { uid } = await getAuth().verifyIdToken(match[1], true);
      if (monitor) {
        const token = req.get('X-Firebase-AppCheck');
        let outcome: 'missing' | 'valid' | 'invalid' = 'missing';
        if (token) {
          try { await withAttestationDeadline(() => monitor.verify(token)); outcome = 'valid'; } catch { outcome = 'invalid'; }
        }
        // Telemetry must never turn into an authorization gate.
        try { monitor.report(outcome); } catch { /* nonblocking observation */ }
      }
      return uid;
    } catch (error) {
      // Never log SDK messages: malformed tokens/configuration can contain secrets.
      const code = error?.code;
      if (code === 'auth/id-token-revoked' || code === 'auth/user-disabled' || code === 'auth/user-not-found') {
        res.status(401).json({ error: 'Sign in again', code: 'AUTH_REAUTHENTICATION_REQUIRED' });
      } else if (code === 'auth/id-token-expired') {
        res.status(401).json({ error: 'Authentication token expired', code: 'AUTH_TOKEN_EXPIRED' });
      } else if (['auth/argument-error', 'auth/invalid-argument', 'auth/invalid-id-token'].includes(code)) {
        res.status(401).json({ error: 'Invalid authentication token', code: 'AUTH_INVALID_TOKEN' });
      } else {
        res.status(503).json({ error: 'Authentication service unavailable', code: 'AUTH_UNAVAILABLE' });
      }
      return null;
    }
  };
}
