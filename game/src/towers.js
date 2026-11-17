// Orbitward — towers: what stands on the orbit rings. A tower sits in a
// ring slot, picks the enemy nearest the core inside its range, and fires
// on a cooldown. Levels multiply damage and fire rate; selling refunds
// part of everything invested.
import { CX, CY, RINGS, TOWERS } from './config.js';

export function slotPosition(ringIndex, slotIndex) {
  const ring = RINGS[ringIndex];
  const angle = (slotIndex / ring.slots) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CX + Math.cos(angle) * ring.r,
    y: CY + Math.sin(angle) * ring.r,
    angle,
  };
}

export function buildTower(ringIndex, slotIndex, kind) {
  const def = TOWERS[kind];
  const pos = slotPosition(ringIndex, slotIndex);
  return {
    kind,
    def,
    ringIndex,
    slotIndex,
    x: pos.x,
    y: pos.y,
    angle: pos.angle,
    level: 1,
    invested: def.cost,
    cooldown: 0,
    aimAngle: -Math.PI / 2,
    flash: 0,
    kills: 0,
  };
}

export function towerDamage(tower) {
  return Math.round(tower.def.dmg * tower.def.dmgMul[tower.level - 1]);
}

export function towerRate(tower) {
  return tower.def.rate * tower.def.rateMul[tower.level - 1];
}

export function upgradeCost(tower) {
  if (tower.level >= 3) return null;
  return tower.def.upgradeCost[tower.level - 1];
}

export function upgradeTower(tower) {
  const cost = upgradeCost(tower);
  if (cost === null) return false;
  tower.invested += cost;
  tower.level += 1;
  tower.flash = 0.3;
  return true;
}

// Pick the target: the live enemy nearest the core inside range.
export function pickTarget(tower, enemies) {
  let best = null;
  let bestR = Infinity;
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > tower.def.range * tower.def.range) continue;
    if (enemy.r < bestR) {
      bestR = enemy.r;
      best = enemy;
    }
  }
  return best;
}

// Tick a tower: cool down, aim, and fire when ready. Returns a projectile
// descriptor when it fires, or null.
export function updateTower(tower, enemies, dt) {
  if (tower.flash > 0) tower.flash -= dt;
  tower.cooldown -= dt;
  const target = pickTarget(tower, enemies);
  if (!target) return null;
  tower.aimAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
  if (tower.cooldown > 0) return null;
  tower.cooldown = 1 / towerRate(tower);
  tower.flash = 0.08;
  return {
    kind: tower.kind,
    x: tower.x + Math.cos(tower.aimAngle) * 16,
    y: tower.y + Math.sin(tower.aimAngle) * 16,
    targetId: target.id,
    target,
    dmg: towerDamage(tower),
    speed: tower.def.projSpeed,
    color: tower.def.color,
    slow: tower.def.slow || 0,
    slowDur: tower.def.slowDur || 0,
    tower,
  };
}
