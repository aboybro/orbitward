// Orbitward — deterministic screenshot scenes. ?shot=start|play|victory|
// defeat&seed=N stages a fixed moment of the game (seeded RNG, fixed
// simulated time, no wall clock) so a screenshot is a real render of the
// game's own code and replays exactly. main.js runs the staged scene for a
// fixed number of 1/60 s steps, then sets window.__shotReady.
import { TOTAL_WAVES } from './config.js';
import { seedRandom, randRange } from './random.js';
import { createGame, makeStars, startRun, startWave, update } from './game.js';
import { buildTower } from './towers.js';
import { makeEnemy } from './enemies.js';

const STEPS = {
  start: 30,
  play: 540, // 9 s of wave 7 at 60 Hz: towers firing, swarm mid-spiral
  victory: 30,
  defeat: 30,
};

function placeTower(game, ring, slot, kind, level) {
  const tower = buildTower(ring, slot, kind);
  tower.level = level;
  tower.invested = 50 + 38 * (level - 1);
  game.towers.push(tower);
  return tower;
}

function decorateTitle(game) {
  game.decor = [];
  const colors = ['#ff7a6b', '#ffe066', '#c98bff', '#7dffb0'];
  for (let i = 0; i < 8; i++) {
    game.decor.push({
      angle: (i / 8) * Math.PI * 2,
      r: 132 + (i % 3) * 80,
      wa: 0.1 + (i % 3) * 0.05,
      color: colors[i % colors.length],
    });
  }
}

function stagePlay(game) {
  startRun(game);
  // A mid-campaign field: a believable ring of towers, some upgraded.
  placeTower(game, 0, 0, 'pulse', 3);
  placeTower(game, 0, 2, 'lance', 2);
  placeTower(game, 0, 4, 'frost', 2);
  placeTower(game, 0, 6, 'pulse', 2);
  placeTower(game, 1, 1, 'lance', 3);
  placeTower(game, 1, 4, 'pulse', 2);
  placeTower(game, 1, 7, 'frost', 1);
  placeTower(game, 2, 0, 'pulse', 1);
  placeTower(game, 2, 3, 'lance', 2);
  placeTower(game, 2, 6, 'frost', 2);
  placeTower(game, 2, 9, 'pulse', 2);
  game.gold = 342;
  game.score = 2450;
  game.kills = 86;
  game.goldEarned = 918;
  game.towersBuilt = 11;
  game.coreHp = 16;
  // Jump to wave 7 and let the simulation run: the swarm, the bolts and
  // the particles are all produced by the real update loop.
  game.wave = 6;
  startWave(game);
}

function stageEnd(game, won) {
  startRun(game);
  game.wave = won ? TOTAL_WAVES : 11;
  game.score = won ? 12480 : 5310;
  game.kills = won ? 312 : 148;
  game.goldEarned = won ? 2410 : 1120;
  game.towersBuilt = won ? 14 : 9;
  game.coreHp = won ? 9 : 0;
  // A few towers left standing (or fallen) for the backdrop.
  placeTower(game, 0, 1, 'pulse', 3);
  placeTower(game, 1, 3, 'lance', 2);
  placeTower(game, 2, 5, 'frost', 2);
  placeTower(game, 2, 8, 'pulse', 1);
  if (!won) {
    // The swarm that broke through, frozen at the core.
    for (let i = 0; i < 6; i++) {
      const e = makeEnemy(i % 2 ? 'swift' : 'drifter', 11);
      e.angle = randRange(0, Math.PI * 2);
      e.r = 60 + i * 14;
      game.enemies.push(e);
    }
  }
  game.screen = won ? 'victory' : 'defeat';
  game.phase = 'build';
  game.newBest = false;
  game.best = { score: won ? 12480 : 9810, wave: won ? 20 : 14 };
}

// Build the staged scene and run it for its fixed step count. Returns the
// game. Shot scenes never touch localStorage or audio.
export function setupShot(scene, seed) {
  seedRandom(seed);
  const game = createGame();
  game.shotMode = true;
  game.stars = makeStars(150);
  const steps = STEPS[scene] ?? STEPS.play;
  if (scene === 'start') {
    decorateTitle(game);
    game.best = { score: 9810, wave: 14 };
  } else if (scene === 'play') {
    stagePlay(game);
  } else if (scene === 'victory') {
    stageEnd(game, true);
  } else if (scene === 'defeat') {
    stageEnd(game, false);
  }
  for (let i = 0; i < steps; i++) update(game, 1 / 60);
  // Keep the play banner visible for the screenshot.
  if (scene === 'play') {
    game.banner = { text: 'WAVE 7', sub: 'Hold the line — the swarm is coming' };
    game.bannerUntil = game.time + 10;
  }
  return game;
}
