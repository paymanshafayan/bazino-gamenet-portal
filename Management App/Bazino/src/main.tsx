import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
