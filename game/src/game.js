// Orbitward — the game itself: state, the wave loop, the economy, and
// every click and key. Rendering lives in render.js, sound in audio.js;
// this module only decides what happens.
import {
  CX, CY, CORE_MAX_HP, START_GOLD, TOTAL_WAVES, SELL_REFUND,
  RINGS, TOWERS, TOWER_ORDER, waveComposition, spawnInterval,
  waveClearBonus,
} from './config.js';
import { random, randRange } from './random.js';
import { loadBest, saveBest } from './storage.js';
import { sfx } from './audio.js';
import {
  makeEnemy, buildSpawnQueue, enemyPosition, updateEnemy, damageEnemy,
  splitOffspring,
} from './enemies.js';
import {
  slotPosition, buildTower, towerDamage, towerRate, upgradeCost,
  upgradeTower, updateTower,
} from './towers.js';
import { makeProjectile, updateProjectile } from './projectiles.js';
import { createFx, burst, ringBurst, floatText, addShake, updateFx } from './particles.js';
import { LAYOUT, inRect } from './layout.js';

export function makeStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: randRange(0, 1280),
      y: randRange(0, 720),
      r: randRange(0.5, 1.8),
      tw: randRange(0, Math.PI * 2),
      speed: randRange(0.4, 1.6),
    });
  }
  return stars;
}

export function createGame() {
  return {
    screen: 'title', // title | playing | victory | defeat
    phase: 'build', // build | wave (only while playing)
    paused: false,
    speed: 1,
    time: 0,
    gold: START_GOLD,
    score: 0,
    kills: 0,
    goldEarned: 0,
    towersBuilt: 0,
    wave: 0,
    coreHp: CORE_MAX_HP,
    towers: [],
    enemies: [],
    projectiles: [],
    spawnQueue: null,
    selected: null, // { kind: 'slot'|'tower', ring, slot, tower }
    buildKind: 'pulse',
    hover: null, // { kind: 'slot'|'tower', ring, slot, tower }
    banner: null,
    bannerUntil: 0,
    hint: '',
    hintUntil: 0,
    best: loadBest(),
    newBest: false,
    fx: createFx(),
    stars: makeStars(150),
    decor: [], // decorative drifters on the title screen
    shotMode: false,
  };
}

export function showBanner(game, text, sub, dur = 2.4) {
  game.banner = { text, sub: sub || '' };
  game.bannerUntil = game.time + dur;
}

export function showHint(game, text, dur = 2.2) {
  game.hint = text;
  game.hintUntil = game.time + dur;
}

export function startRun(game) {
  const keepStars = game.stars;
  const best = game.best;
  const keepShot = game.shotMode;
  const fresh = createGame();
  fresh.stars = keepStars;
  fresh.best = best;
  fresh.shotMode = keepShot;
  Object.assign(game, fresh);
  game.screen = 'playing';
  game.phase = 'build';
  showBanner(game, 'HOLD THE CORE', 'Build on the rings — then start wave 1', 3.2);
}

function endRun(game, won) {
  game.screen = won ? 'victory' : 'defeat';
  game.phase = 'build';
  game.spawnQueue = null;
  if (won) {
    game.score += game.coreHp * 50;
    sfx.victory();
  } else {
    sfx.defeat();
  }
  game.newBest = saveBest(game.score, game.wave);
  game.best = loadBest();
}

export function startWave(game) {
  if (game.screen !== 'playing' || game.phase !== 'build' || game.paused) return;
  game.wave += 1;
  game.phase = 'wave';
  game.spawnQueue = buildSpawnQueue(waveComposition(game.wave), spawnInterval(game.wave));
  showBanner(game, `WAVE ${game.wave}`, game.wave % 5 === 0 ? 'A Warden approaches' : `${game.spawnQueue.types.length} hostiles inbound`, 2.2);
  sfx.waveHorn();
}

function waveCleared(game) {
  const bonus = waveClearBonus(game.wave);
  game.gold += bonus;
  game.goldEarned += bonus;
  game.score += 100 * game.wave;
  if (game.wave >= TOTAL_WAVES) {
    endRun(game, true);
    return;
  }
  game.phase = 'build';
  showBanner(game, `WAVE ${game.wave} CLEARED`, `+${bonus} gold bonus — build, then start wave ${game.wave + 1}`, 2.6);
  sfx.waveClear();
}

function spawnNext(game) {
  const q = game.spawnQueue;
  if (!q || q.index >= q.types.length) {
    game.spawnQueue = null;
    return;
  }
  const type = q.types[q.index++];
  game.enemies.push(makeEnemy(type, game.wave));
}

function coreStruck(game, enemy) {
  game.coreHp -= enemy.def.dmg;
  const pos = enemyPosition(enemy);
  burst(game.fx, CX, CY, '#ff5d73', 26, 260, 4);
  ringBurst(game.fx, CX, CY, '#ffd166', 18);
  addShake(game.fx, 9);
  floatText(game.fx, CX + 60, CY - 40, `-${enemy.def.dmg} CORE`, '#ff5d73');
  sfx.coreHit();
  enemy.dead = true;
  if (game.coreHp <= 0) {
    game.coreHp = 0;
    burst(game.fx, CX, CY, '#ffd166', 60, 380, 5);
    endRun(game, false);
  }
}

function onKill(game, enemy, tower, x, y) {
  enemy.dead = true; // Mark at once: towers and bolts must stop aiming at
  // the corpse, or they keep firing at it while live enemies walk past.
  game.gold += enemy.def.reward;
  game.goldEarned += enemy.def.reward;
  game.score += enemy.def.score;
  game.kills += 1;
  if (tower) tower.kills += 1;
  burst(game.fx, x, y, enemy.def.color, enemy.type === 'warden' ? 46 : 14, 220, 3.5);
  floatText(game.fx, x, y - 14, `+${enemy.def.reward}`, '#ffd166');
  if (enemy.type === 'warden') {
    ringBurst(game.fx, x, y, '#ff4d6d', 28);
    addShake(game.fx, 7);
  }
  sfx.kill();
  if (enemy.type === 'splitter') {
    for (const kid of splitOffspring(enemy, game.wave)) game.enemies.push(kid);
  }
}

export function update(game, dt) {
  if (game.screen !== 'playing' || game.paused) {
    updateFx(game.fx, dt);
    return;
  }
  dt *= game.speed;
  game.time += dt;

  // Spawn the wave.
  if (game.spawnQueue) {
    const q = game.spawnQueue;
    q.timer -= dt;
    while (q.timer <= 0 && q.index < q.types.length) {
      spawnNext(game);
      q.timer += q.interval;
    }
    if (q.index >= q.types.length) game.spawnQueue = null;
  }

  // Enemies spiral in; cache screen positions for towers and projectiles.
  for (const enemy of game.enemies) {
    const pos = enemyPosition(enemy);
    enemy.x = pos.x;
    enemy.y = pos.y;
    if (updateEnemy(enemy, dt, game.time) === 'core') coreStruck(game, enemy);
    if (game.screen !== 'playing') return; // core fell mid-step
  }
  game.enemies = game.enemies.filter((e) => !e.dead);

  // Towers fire.
  for (const tower of game.towers) {
    const desc = updateTower(tower, game.enemies, dt);
    if (desc) {
      game.projectiles.push(makeProjectile(desc));
      if (desc.kind === 'lance') sfx.lance();
      else if (desc.kind === 'frost') sfx.frost();
      else sfx.shoot();
    }
  }

  // Projectiles fly and resolve.
  for (const p of game.projectiles) {
    const events = updateProjectile(p, dt, game.time);
    for (const ev of events) {
      if (ev.type === 'kill') onKill(game, ev.enemy, ev.tower, ev.x, ev.y);
      else {
        burst(game.fx, ev.x, ev.y, '#cfe6ff', 3, 90, 2);
        if (random() < 0.4) sfx.hit();
      }
    }
  }
  game.projectiles = game.projectiles.filter((p) => !p.dead);
  game.enemies = game.enemies.filter((e) => !e.dead);

  updateFx(game.fx, dt);

  // Wave clear?
  if (game.phase === 'wave' && !game.spawnQueue && game.enemies.length === 0) {
    waveCleared(game);
  }
}

// ---- selection and building ---------------------------------------------

export function slotAt(game, x, y) {
  for (let r = 0; r < RINGS.length; r++) {
    for (let s = 0; s < RINGS[r].slots; s++) {
      const pos = slotPosition(r, s);
      if (Math.hypot(x - pos.x, y - pos.y) <= 26) return { ring: r, slot: s };
    }
  }
  return null;
}

export function towerAt(game, x, y) {
  for (const tower of game.towers) {
    if (Math.hypot(x - tower.x, y - tower.y) <= 26) return tower;
  }
  return null;
}

function towerInSlot(game, ring, slot) {
  return game.towers.find((t) => t.ringIndex === ring && t.slotIndex === slot) || null;
}

export function tryBuild(game, kind) {
  const sel = game.selected;
  if (!sel || sel.kind !== 'slot') return;
  const def = TOWERS[kind];
  if (game.gold < def.cost) {
    showHint(game, `Need ${def.cost} gold for a ${def.name}`);
    sfx.denied();
    return;
  }
  if (towerInSlot(game, sel.ring, sel.slot)) return;
  game.gold -= def.cost;
  const tower = buildTower(sel.ring, sel.slot, kind);
  game.towers.push(tower);
  game.towersBuilt += 1;
  game.selected = { kind: 'tower', tower };
  burst(game.fx, tower.x, tower.y, def.color, 16, 160, 3);
  sfx.build();
}

export function tryUpgrade(game) {
  const sel = game.selected;
  if (!sel || sel.kind !== 'tower') return;
  const tower = sel.tower;
  const cost = upgradeCost(tower);
  if (cost === null) {
    showHint(game, 'Already at max level');
    return;
  }
  if (game.gold < cost) {
    showHint(game, `Need ${cost} gold to upgrade`);
    sfx.denied();
    return;
  }
  game.gold -= cost;
  upgradeTower(tower);
  burst(game.fx, tower.x, tower.y, tower.def.color, 20, 180, 3.5);
  sfx.upgrade();
}

export function trySell(game) {
  const sel = game.selected;
  if (!sel || sel.kind !== 'tower') return;
  const tower = sel.tower;
  const refund = Math.floor(tower.invested * SELL_REFUND);
  game.gold += refund;
  game.towers = game.towers.filter((t) => t !== tower);
  game.selected = null;
  floatText(game.fx, tower.x, tower.y - 18, `+${refund}`, '#ffd166');
  sfx.sell();
}

// ---- clicks and keys ------------------------------------------------------

export function handleClick(game, x, y) {
  if (game.screen === 'title') {
    if (inRect(LAYOUT.titleStartBtn, x, y)) {
      sfx.click();
      startRun(game);
    }
    return;
  }
  if (game.screen === 'victory' || game.screen === 'defeat') {
    if (inRect(LAYOUT.endRestartBtn, x, y)) {
      sfx.click();
      startRun(game);
    }
    return;
  }

  // Top-right buttons always work while playing.
  if (inRect(LAYOUT.speedBtn, x, y)) {
    game.speed = game.speed === 1 ? 2 : 1;
    sfx.click();
    return;
  }
  if (inRect(LAYOUT.pauseBtn, x, y)) {
    game.paused = !game.paused;
    sfx.click();
    return;
  }
  if (inRect(LAYOUT.muteBtn, x, y)) {
    if (game.toggleMute) game.toggleMute();
    return;
  }

  if (game.paused) return;

  // Selected tower panel.
  if (game.selected && game.selected.kind === 'tower' && inRect(LAYOUT.panel, x, y)) {
    if (inRect(LAYOUT.upgradeBtn, x, y)) tryUpgrade(game);
    else if (inRect(LAYOUT.sellBtn, x, y)) trySell(game);
    return;
  }

  // Build palette.
  for (const card of LAYOUT.palette) {
    if (inRect(card, x, y)) {
      game.buildKind = card.kind;
      sfx.click();
      if (game.selected && game.selected.kind === 'slot') tryBuild(game, card.kind);
      return;
    }
  }

  // Start wave button.
  if (game.phase === 'build' && inRect(LAYOUT.startWaveBtn, x, y)) {
    startWave(game);
    return;
  }

  // Rings: tower first, then empty slot.
  const tower = towerAt(game, x, y);
  if (tower) {
    game.selected = { kind: 'tower', tower };
    sfx.click();
    return;
  }
  const slot = slotAt(game, x, y);
  if (slot) {
    if (towerInSlot(game, slot.ring, slot.slot)) return;
    game.selected = { kind: 'slot', ring: slot.ring, slot: slot.slot };
    sfx.click();
    return;
  }

  game.selected = null;
}

export function handleMove(game, x, y) {
  if (game.screen !== 'playing') {
    game.hover = null;
    return;
  }
  const tower = towerAt(game, x, y);
  if (tower) {
    game.hover = { kind: 'tower', tower };
    return;
  }
  const slot = slotAt(game, x, y);
  game.hover = slot ? { kind: 'slot', ring: slot.ring, slot: slot.slot } : null;
}

export function handleKey(game, key) {
  if (key === 'm' && game.toggleMute) {
    game.toggleMute();
    return;
  }
  if (game.screen === 'title') {
    if (key === ' ' || key === 'enter') startRun(game);
    return;
  }
  if (game.screen === 'victory' || game.screen === 'defeat') {
    if (key === ' ' || key === 'enter' || key === 'r') startRun(game);
    return;
  }
  // Playing.
  if (key === 'p' || key === 'escape') {
    if (key === 'escape' && game.selected) {
      game.selected = null;
      return;
    }
    game.paused = !game.paused;
    return;
  }
  if (game.paused) return;
  if (key === ' ') {
    if (game.phase === 'build') startWave(game);
    return;
  }
  if (key === 'f') {
    game.speed = game.speed === 1 ? 2 : 1;
    return;
  }
  if (key === '1' || key === '2' || key === '3') {
    const kind = TOWER_ORDER[Number(key) - 1];
    game.buildKind = kind;
    if (game.selected && game.selected.kind === 'slot') tryBuild(game, kind);
    return;
  }
  if (key === 'u') tryUpgrade(game);
  if (key === 'x') trySell(game);
}
