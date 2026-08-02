/**
 * Web Audio API Sound Synthesizer for BAZINO PRO Game Net Alarm System
 * Supports customizable alarm tones: arcade_bell, siren, gentle_chime, digital_beep, radar_ping
 * Works reliably in browsers with repeat intervals and volume settings.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAlarmSound(
  type: 'arcade_bell' | 'siren' | 'gentle_chime' | 'digital_beep' | 'radar_ping' = 'arcade_bell',
  volume = 0.8
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
    gainNode.connect(ctx.destination);

    if (type === 'arcade_bell') {
      // Classic Game Over / Time Up Arcade Ring
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + index * 0.12);
        
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.7, now + index * 0.12);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.35);
        
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.4);
      });
    } else if (type === 'digital_beep') {
      // Triple high-pitched digital warning beep
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now + i * 0.15);
        osc.frequency.exponentialRampToValueAtTime(800, now + i * 0.15 + 0.08);

        const beepGain = ctx.createGain();
        beepGain.gain.setValueAtTime(0.8, now + i * 0.15);
        beepGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);

        osc.connect(beepGain);
        beepGain.connect(gainNode);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      }
    } else if (type === 'siren') {
      // Warning Siren
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.3);
      osc.frequency.linearRampToValueAtTime(400, now + 0.6);
      osc.frequency.linearRampToValueAtTime(900, now + 0.9);

      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === 'gentle_chime') {
      // Soft gentle chime notification
      const chord = [440, 554.37, 659.25, 880];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const chimeGain = ctx.createGain();
        chimeGain.gain.setValueAtTime(0.3, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(chimeGain);
        chimeGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + 1.5);
      });
    } else if (type === 'radar_ping') {
      // Submarine radar ping
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

      gainNode.gain.setValueAtTime(0.8, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch (err) {
    console.warn('Audio playback not allowed or failed:', err);
  }
}
