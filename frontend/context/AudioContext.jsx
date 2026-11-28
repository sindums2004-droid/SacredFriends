import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const AudioContextState = createContext({
  isAudioEnabled: false,
  toggleAudio: () => {},
  playFlute: () => {},
  playDamru: () => {},
  playVeena: () => {},
  playBell: () => {},
  playCompanionSound: () => {}
});

export const AudioProvider = ({ children }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTempleBell = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bellPartials = [
      { freq: 440, amp: 0.18, decay: 2.2 },
      { freq: 885, amp: 0.12, decay: 1.8 },
      { freq: 1320, amp: 0.08, decay: 1.4 },
      { freq: 1765, amp: 0.05, decay: 0.9 }
    ];

    bellPartials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      gain.gain.setValueAtTime(p.amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    });
  }, [getAudioContext]);

  const playFluteMelody = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00];

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.32;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 5.5;
      vibratoGain.gain.value = 6;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(startTime);
      vibrato.stop(startTime + 0.38);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }, [getAudioContext]);

  const playDamruRhythm = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const strikes = [0, 0.14, 0.28, 0.42];

    strikes.forEach((delay) => {
      const startTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, startTime);
      osc.frequency.exponentialRampToValueAtTime(75, startTime + 0.1);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.13);
    });
  }, [getAudioContext]);

  const playVeenaPluck = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const harmonics = [220, 440, 660, 880];
    const weights = [0.15, 0.08, 0.04, 0.02];

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(weights[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.65);
    });
  }, [getAudioContext]);

  const toggleAudio = useCallback((forceState) => {
    setIsAudioEnabled((prev) => {
      const next = forceState !== undefined ? forceState : !prev;
      if (next) {
        setTimeout(playTempleBell, 50);
      }
      return next;
    });
  }, [playTempleBell]);

  const playCompanionSound = useCallback((charId) => {
    setIsAudioEnabled((prev) => {
      if (!prev) return true;
      return prev;
    });

    switch (charId) {
      case 'krishna':
      case 'radha':
        playFluteMelody();
        break;
      case 'shiva':
      case 'narasimha':
        playDamruRhythm();
        break;
      case 'saraswati':
        playVeenaPluck();
        break;
      default:
        playTempleBell();
        break;
    }
  }, [playFluteMelody, playDamruRhythm, playVeenaPluck, playTempleBell]);

  return (
    <AudioContextState.Provider
      value={{
        isAudioEnabled,
        toggleAudio,
        playFlute: playFluteMelody,
        playDamru: playDamruRhythm,
        playVeena: playVeenaPluck,
        playBell: playTempleBell,
        playCompanionSound
      }}
    >
      {children}
    </AudioContextState.Provider>
  );
};

export const useAudio = () => useContext(AudioContextState);
