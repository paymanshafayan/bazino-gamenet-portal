import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { OpsProvider } from '../../../shared/management/context';

// Legacy local UI requests use the same authenticated account as operational APIs.
const baseFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return baseFetch(input, init);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  try { const token = localStorage.getItem('bazino.authToken'); if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`); } catch {}
  return baseFetch(input, { ...init, headers });
};
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Unlock Web Audio API on iOS Safari (iPhone 14 Pro, etc.) upon first user tap
const unlockAudioOnIOS = () => {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'pointerdown'];
  const handleInteraction = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const dummyCtx = new AudioCtx();
        if (dummyCtx.state === 'suspended') {
          dummyCtx.resume();
        }
      }
    } catch (e) {
      // Audio context ignored if blocked
    } finally {
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleInteraction));
    }
  };

  unlockEvents.forEach((evt) => window.addEventListener(evt, handleInteraction, { once: true, passive: true }));
};

unlockAudioOnIOS();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <OpsProvider gate><App /></OpsProvider>
    </ErrorBoundary>
  </StrictMode>,
);
