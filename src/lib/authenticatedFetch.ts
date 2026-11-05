import { withAttestationDeadline } from './attestationDeadline';

type SessionUser = { uid: string; getIdToken(forceRefresh?: boolean): Promise<string> };
type Options = {
  origin: string;
  getCurrentUser(): SessionUser | null | undefined;
  fetch: typeof fetch;
  getAppCheckToken?(): Promise<string | undefined>;
};

/** Send credentials only to this application's API, never through redirects. */
export function createAuthenticatedFetch(options: Options) {
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), options.origin);
    if (url.origin !== options.origin || !url.pathname.startsWith('/api/') || url.username || url.password) {
      throw new Error('Destino de API não permitido.');
    }
    const user = options.getCurrentUser();
    if (!user) throw new Error('É necessário entrar na conta para continuar.');
    // Clone the template for each send, including bodies supplied through Request.
    const template = input instanceof Request ? new Request(input, init) : new Request(url.href, init);
    const ensureSession = () => {
      if (options.getCurrentUser() !== user) throw new Error('A sessão mudou. Entre novamente.');
    };
    const send = async (forceRefresh = false) => {
      ensureSession();
      const token = await user.getIdToken(forceRefresh);
      let appCheckToken: string | undefined;
      try { appCheckToken = options.getAppCheckToken ? await withAttestationDeadline(options.getAppCheckToken) : undefined; } catch {
        // Observation rollout only: attestation failure must not block Auth.
      }
      ensureSession();
      const headers = new Headers(template.headers);
      headers.set('Authorization', `Bearer ${token}`);
      headers.delete('X-Firebase-AppCheck');
      if (appCheckToken) headers.set('X-Firebase-AppCheck', appCheckToken);
      return options.fetch(template.clone(), { headers, redirect: 'error' });
    };
    const response = await send();
    if (response.status === 401 && options.getCurrentUser() === user) {
      const failure = await response.clone().json().catch(() => null);
      // Revoked/disabled sessions require a fresh sign-in, never a replay.
      if (failure?.code === 'AUTH_REAUTHENTICATION_REQUIRED') return response;
      return send(true);
    }
    return response;
  };
}
