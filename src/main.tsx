import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Suppress benign Vite WebSocket / HMR connection errors in the sandbox environment
if (typeof window !== 'undefined') {
  const isBenignError = (errStr: string) => {
    return (
      errStr.includes('WebSocket') ||
      errStr.includes('vite') ||
      errStr.includes('HMR') ||
      errStr.includes('ws://') ||
      errStr.includes('wss://')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const errStr = reason.stack || reason.message || String(reason);
      if (isBenignError(errStr)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn('[Vite Sandbox Suppressed Rejection]:', errStr);
      }
    }
  });

  window.addEventListener('error', (event) => {
    const errStr = event.message || '';
    if (isBenignError(errStr)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Vite Sandbox Suppressed Error]:', errStr);
    }
  }, true);
}

import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { installAuthFetchInterceptor } from './services/authToken';
import { captureReferralFromUrl } from './utils/affiliateCapture';

// Attaches the stored JWT to same-origin /api/** requests. Must run before the
// app mounts so the very first data fetches are authenticated too.
installAuthFetchInterceptor();
captureReferralFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
