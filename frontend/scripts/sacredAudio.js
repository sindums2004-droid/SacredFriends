/**
 * Sacred Friends — Procedural Web Audio Soundscape Engine
 * Pure Web Audio API: Generates authentic Vedic frequencies, flute notes,
 * damru rhythms, veena plucks, and temple bells with zero external audio files.
 */

let audioCtx = null;
let isAudioEnabled = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleAudio(forceState) {
  if (forceState !== undefined) {
    isAudioEnabled = forceState;
  } else {
    isAudioEnabled = !isAudioEnabled;
  }

  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    btn.innerHTML = isAudioEnabled
      ? `<span>🔊 Sound: On</span>`
      : `<span>🔈 Sound: Off</span>`;
    btn.classList.toggle('active', isAudioEnabled);
  }

  if (isAudioEnabled) {
    playTempleBell();
  }

  return isAudioEnabled;
}

/**
 * 1. Divine Bansuri Flute (Krishna / Radha)
 * Warm flute frequency with expressive breath vibrato (Raga Yaman / Bhupali scale)
 */
export function playFluteMelody() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled) return;

  const now = ctx.currentTime;
  // Notes in Hz: C5 (523.25), D5 (587.33), E5 (659.25), G5 (783.99), A5 (880.00)
  const notes = [523.25, 587.33, 659.25, 783.99, 880.00];

  notes.forEach((freq, idx) => {
    const startTime = now + idx * 0.32;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Gentle vibrato LFO
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5.5; // 5.5 Hz vibrato
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
}

/**
 * 2. Cosmic Damru Rhythm (Little Shiva)
 * Two rapid percussive pitch sweeps simulating a traditional hourglass damru
 */
export function playDamruRhythm() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled) return;

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
}

/**
 * 3. Sacred Veena Pluck (Saraswati Devi)
 * Harmonic acoustic pluck with gentle decay
 */
export function playVeenaPluck() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled) return;

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
}

/**
 * 4. Auspicious Temple Bell Chime (Durga, Ganesha, Hanuman, Lakshmi)
 * Deep bell fundamental with shimmering metallic high overtones
 */
export function playTempleBell() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled) return;

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
}

/**
 * Play sound appropriate to companion ID
 */
export function playCompanionSound(charId) {
  if (!isAudioEnabled) {
    toggleAudio(true);
  }

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
}

export function initSacredAudio() {
  const soundToggleBtn = document.getElementById('btn-sound-toggle');
  soundToggleBtn?.addEventListener('click', () => {
    toggleAudio();
  });
}

