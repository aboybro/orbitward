// Orbitward — projectiles: the bolts towers fire. A bolt chases its
// target's live position and bursts on arrival; if the target died first
// the bolt fizzles at the last known spot. Lance bolts are instant beams
// drawn for a blink instead of travelling.
import { damageEnemy, applySlow } from './enemies.js';

export function makeProjectile(desc) {
  return {
    kind: desc.kind,
    x: desc.x,
    y: desc.y,
    tx: desc.target.x,
    ty: desc.target.y,
    target: desc.target,
    targetId: desc.targetId,
    dmg: desc.dmg,
    speed: desc.speed,
    color: desc.color,
    slow: desc.slow,
    slowDur: desc.slowDur,
    tower: desc.tower,
    life: 1.6,
    dead: false,
  };
}

// Returns an event list: { type: 'hit'|'kill', enemy, tower, x, y }.
export function updateProjectile(p, dt, time) {
  const events = [];
  p.life -= dt;
  if (p.life <= 0) {
    p.dead = true;
    return events;
  }
  if (!p.target.dead) {
    p.tx = p.target.x;
    p.ty = p.target.y;
  }
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const dist = Math.hypot(dx, dy);
  const step = p.speed * dt;
  if (dist <= Math.max(step, 10)) {
    p.dead = true;
    if (!p.target.dead) {
      if (p.slow > 0) applySlow(p.target, p.slow, p.slowDur, time);
      const killed = damageEnemy(p.target, p.dmg);
      events.push({ type: killed ? 'kill' : 'hit', enemy: p.target, tower: p.tower, x: p.tx, y: p.ty });
    }
    return events;
  }
  p.x += (dx / dist) * step;
  p.y += (dy / dist) * step;
  return events;
}
