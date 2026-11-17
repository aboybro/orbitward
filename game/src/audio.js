// Orbitward — all sound is synthesized with WebAudio: no audio files, no
// network. Short oscillator blips and filtered noise bursts for effects, and
// a quiet two-bar sequencer that hums under play. Created lazily on the
// first user gesture, so browsers never block it.
let ctx = null;
let master = null;
let muted = false;
let musicTimer = 0;
let musicStep = 0;

// A slow, cold arpeggio in A minor; step length in seconds.
const MUSIC_NOTES = [110.0, 130.81, 164.81, 196.0, 164.81, 130.81, 98.0, 146.83];
const STEP_LEN = 0.24;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const sfx = {
  shoot() { tone(880, 0.07, 'square', 0.05, 520); },
  lance() { tone(220, 0.16, 'sawtooth', 0.07, 90); },
  frost() { tone(1320, 0.12, 'sine', 0.06, 1760); },
  hit() { tone(320, 0.05, 'triangle', 0.04, 180); },
  kill() { tone(520, 0.14, 'triangle', 0.09, 130); noiseBurst(0.12, 0.08, 2400); },
  build() { tone(196, 0.12, 'triangle', 0.12, 392); tone(392, 0.1, 'sine', 0.08); },
  upgrade() { tone(392, 0.1, 'triangle', 0.1, 523); tone(523, 0.14, 'triangle', 0.1, 784); },
  sell() { tone(523, 0.1, 'triangle', 0.08, 262); },
  coreHit() { tone(110, 0.35, 'sawtooth', 0.16, 55); noiseBurst(0.25, 0.12, 900); },
  waveHorn() { tone(98, 0.5, 'sawtooth', 0.1, 147); tone(147, 0.5, 'sawtooth', 0.07, 196); },
  waveClear() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.1), i * 90)); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.11), i * 130)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.09), i * 180)); },
  click() { tone(660, 0.05, 'sine', 0.06); },
  denied() { tone(160, 0.12, 'square', 0.07, 120); },
};

// Called every frame with dt; steps the music sequencer while the game is
// in a playing screen. Silent in shot mode and before first interaction.
export function updateMusic(dt, playing) {
  if (!ctx || muted || !playing) return;
  musicTimer -= dt;
  while (musicTimer <= 0) {
    musicTimer += STEP_LEN;
    const note = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
    musicStep++;
    // Quiet pad note on every step, a brighter ping every fourth step.
    tone(note, STEP_LEN * 1.8, 'sine', 0.035);
    if (musicStep % 4 === 1) tone(note * 2, 0.2, 'triangle', 0.02);
  }
}
