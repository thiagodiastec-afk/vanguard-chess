import { getFirebaseAuth, getFirebaseAppCheckToken } from './firebase';
import { createAuthenticatedFetch } from './authenticatedFetch';

/** Adds Firebase credentials only to same-origin API requests. */
export function authenticatedApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return createAuthenticatedFetch({
    origin: window.location.origin,
    getCurrentUser: () => getFirebaseAuth()?.currentUser,
    getAppCheckToken: getFirebaseAppCheckToken,
    fetch: (request, options) => fetch(request, options),
  })(input, init);
}
