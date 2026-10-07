import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// A deployment can remove an old lazy-loaded chunk while a tab is still open.
// Vite emits this event when that happens; reload once so the tab fetches the
// current, non-cached HTML entry point instead of remaining on a broken screen.
const preloadRecoveryKey = 'vanguard:preload-recovery';
try {
  // Keep the marker briefly after a reload, then allow recovery from a later,
  // unrelated deployment. This also prevents an infinite reload loop.
  window.setTimeout(() => sessionStorage.removeItem(preloadRecoveryKey), 30_000);
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    if (sessionStorage.getItem(preloadRecoveryKey) === 'used') return;
    sessionStorage.setItem(preloadRecoveryKey, 'used');
    window.location.reload();
  });
} catch {
  // Storage can be disabled in privacy modes; the app still works without recovery.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
