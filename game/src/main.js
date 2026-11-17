// Orbitward — bootstrap and the main loop. One canvas, one fixed logical
// stage (1280x720) scaled to the window, requestAnimationFrame with a
// clamped delta. ?shot=start|play|victory|defeat&seed=N stages a
// deterministic screenshot scene instead of the title screen.
import { VIEW_W, VIEW_H } from './config.js';
import { seedRandom } from './random.js';
import { createInput } from './input.js';
import { createGame, handleClick, handleMove, handleKey, update } from './game.js';
import { draw } from './render.js';
import { ensureAudio, toggleMute, isMuted, updateMusic } from './audio.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const shotSeed = Number(params.get('seed') || '1');

let game;
if (shotScene) {
  game = setupShot(shotScene, Number.isFinite(shotSeed) ? shotSeed : 1);
} else {
  seedRandom((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  game = createGame();
}

// Mute lives in audio.js; the game calls back through this hook.
game.toggleMute = () => {
  ensureAudio();
  toggleMute();
};

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = createInput(canvas, {
  onClick(x, y) {
    ensureAudio();
    handleClick(game, x, y);
  },
  onMove(x, y) {
    handleMove(game, x, y);
  },
  onKey(key) {
    ensureAudio();
    handleKey(game, key);
  },
});

// Debug handle for play-testing: window.__orbitward.state is the live game,
// and step() advances it by dt seconds without waiting for animation frames.
window.__orbitward = {
  get state() {
    return game;
  },
  get muted() {
    return isMuted();
  },
  step(dt) {
    update(game, dt);
  },
};

let last = performance.now();
let shotReadySet = false;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!game.shotMode) {
    update(game, dt);
    updateMusic(dt, game.screen === 'playing' && !game.paused);
  } else if (!shotReadySet) {
    // The staged scene already simulated its fixed steps; one draw is
    // enough, then the screenshot runner may capture it.
    draw(ctx, game, isMuted());
    window.__shotReady = true;
    shotReadySet = true;
    return;
  }
  draw(ctx, game, isMuted());
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
