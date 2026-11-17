// Orbitward — enemies: the swarm that spirals in toward the core.
// An enemy lives on polar coordinates (angle, radius) around the core and
// drifts inward while circling it. Splitters burst into Motes on death and
// Wardens are the boss of every fifth wave.
import { CX, CY, ENEMIES, SPAWN_R, CORE_R, waveHpMul, waveSpeedMul } from './config.js';
import { random, randRange } from './random.js';

let nextId = 1;

export function makeEnemy(type, wave) {
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * waveHpMul(wave));
  const speedMul = waveSpeedMul(wave);
  return {
    id: nextId++,
    type,
    def,
    angle: random() * Math.PI * 2,
    r: SPAWN_R + randRange(0, 40),
    hp,
    maxHp: hp,
    vr: def.vr * speedMul,
    wa: def.wa * speedMul,
    slowUntil: 0,
    slowFactor: 1,
    flash: 0,
    wobble: random() * Math.PI * 2,
    dead: false,
  };
}

// A wave's spawn queue: shuffled groups, one enemy every interval.
export function buildSpawnQueue(composition, interval) {
  const queue = [];
  for (const group of composition) {
    for (let i = 0; i < group.count; i++) queue.push(group.type);
  }
  // Shuffle, but keep the Warden (if any) last so the boss closes the wave.
  const wardenIdx = queue.indexOf('warden');
  let warden = null;
  if (wardenIdx !== -1) warden = queue.splice(wardenIdx, 1)[0];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  if (warden) queue.push(warden);
  return { types: queue, interval, timer: 1.2, index: 0 };
}

export function enemyPosition(enemy) {
  return {
    x: CX + Math.cos(enemy.angle) * enemy.r,
    y: CY + Math.sin(enemy.angle) * enemy.r,
  };
}

// Advance one enemy one step. Returns 'core' when it reaches the core.
export function updateEnemy(enemy, dt, time) {
  if (enemy.flash > 0) enemy.flash -= dt;
  const slowed = time < enemy.slowUntil;
  const factor = slowed ? enemy.slowFactor : 1;
  enemy.angle += enemy.wa * factor * dt;
  enemy.r -= enemy.vr * factor * dt;
  // A gentle wobble so the swarm never looks like it rides rails.
  enemy.wobble += dt * 2;
  if (enemy.r <= CORE_R + enemy.def.radius * 0.4) return 'core';
  return null;
}

export function damageEnemy(enemy, dmg) {
  enemy.hp -= dmg;
  enemy.flash = 0.12;
  return enemy.hp <= 0;
}

export function applySlow(enemy, factor, dur, time) {
  enemy.slowFactor = factor;
  enemy.slowUntil = time + dur;
}

// What a dying Splitter leaves behind.
export function splitOffspring(enemy, wave) {
  const kids = [];
  for (let i = 0; i < 2; i++) {
    const kid = makeEnemy('mote', wave);
    kid.angle = enemy.angle + (i === 0 ? 0.25 : -0.25);
    kid.r = enemy.r + 6;
    kids.push(kid);
  }
  return kids;
}
