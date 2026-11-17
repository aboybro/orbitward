// Orbitward — particles, floating score text and screen shake. Pure
// presentation: nothing here changes the game state, so a bad frame can
// never break a run.
import { randRange } from './random.js';

export function createFx() {
  return {
    particles: [],
    texts: [],
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };
}

export function burst(fx, x, y, color, count, speed, size) {
  for (let i = 0; i < count; i++) {
    const angle = randRange(0, Math.PI * 2);
    const v = randRange(speed * 0.3, speed);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: randRange(0.35, 0.8),
      maxLife: 0.8,
      size: randRange(size * 0.5, size),
      color,
    });
  }
  if (fx.particles.length > 420) fx.particles.splice(0, fx.particles.length - 420);
}

export function ringBurst(fx, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    fx.particles.push({
      x,
      y,
      vx: Math.cos(angle) * 160,
      vy: Math.sin(angle) * 160,
      life: 0.55,
      maxLife: 0.55,
      size: 3,
      color,
    });
  }
}

export function floatText(fx, x, y, text, color) {
  fx.texts.push({ x, y, text, color, life: 1.0 });
  if (fx.texts.length > 24) fx.texts.shift();
}

export function addShake(fx, amount) {
  fx.shake = Math.min(14, fx.shake + amount);
}

export function updateFx(fx, dt) {
  for (const p of fx.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const t of fx.texts) {
    t.y -= 34 * dt;
    t.life -= dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - dt * 26);
    fx.shakeX = randRange(-fx.shake, fx.shake);
    fx.shakeY = randRange(-fx.shake, fx.shake);
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
}
