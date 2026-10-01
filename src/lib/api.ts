import { getFirebaseAuth } from './firebase';

/** Adds the signed-in Firebase user's ID token to same-origin API requests. */
export async function authenticatedApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error('É necessário entrar na conta para continuar.');

  const send = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const response = await send(await user.getIdToken());
  // Refresh a cached Firebase ID token once when the backend rejects it.
  // This recovers sessions whose token expired or was invalidated while the
  // browser tab stayed open, without asking the user to sign in again.
  if (response.status === 401 && getFirebaseAuth()?.currentUser?.uid === user.uid) {
    return send(await user.getIdToken(true));
  }
  return response;
}
