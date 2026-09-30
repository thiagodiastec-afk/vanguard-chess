import { getFirebaseAuth } from './firebase';

/** Adds the signed-in Firebase user's ID token to same-origin API requests. */
export async function authenticatedApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error('É necessário entrar na conta para continuar.');

  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
