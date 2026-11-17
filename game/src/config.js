// Orbitward — balance and world constants. One place for every number the
// designers tune: the arena, the core, the orbit rings, the three tower
// kinds, the five enemy kinds and the twenty-wave campaign.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const CX = VIEW_W / 2;
export const CY = VIEW_H / 2;

export const CORE_R = 46;
export const CORE_MAX_HP = 20;
export const START_GOLD = 130;
export const TOTAL_WAVES = 20;
export const SELL_REFUND = 0.7;

// Orbit rings the towers stand on: radius from the core and how many build
// slots each ring holds. Slots are spread evenly around the ring.
export const RINGS = [
  { r: 132, slots: 8 },
  { r: 212, slots: 10 },
  { r: 292, slots: 12 },
];

// Enemies spiral in from just outside the outer ring (SPAWN_R) and strike
// the core when they reach it.
export const SPAWN_R = 348;

// Tower kinds. rate = shots per second, dmg per hit, range in px.
// upgradeCost[l] is what level l+1 costs (level 1 is the build cost).
export const TOWERS = {
  pulse: {
    key: 'pulse',
    name: 'Pulse',
    blurb: 'Rapid bolts, short reach',
    cost: 55,
    range: 128,
    rate: 2.4,
    dmg: 7,
    projSpeed: 560,
    color: '#6fe3ff',
    glow: '#1e90c8',
    upgradeCost: [38, 62],
    dmgMul: [1, 1.7, 2.8],
    rateMul: [1, 1.15, 1.35],
  },
  lance: {
    key: 'lance',
    name: 'Lance',
    blurb: 'Long piercing beam',
    cost: 95,
    range: 215,
    rate: 0.75,
    dmg: 36,
    projSpeed: 900,
    color: '#ffb347',
    glow: '#c86a1e',
    upgradeCost: [64, 102],
    dmgMul: [1, 1.7, 2.8],
    rateMul: [1, 1.1, 1.25],
  },
  frost: {
    key: 'frost',
    name: 'Frost',
    blurb: 'Chills and slows the swarm',
    cost: 65,
    range: 118,
    rate: 1.1,
    dmg: 4,
    slow: 0.5,
    slowDur: 1.8,
    projSpeed: 460,
    color: '#a78bff',
    glow: '#6a4fd0',
    upgradeCost: [45, 72],
    dmgMul: [1, 1.6, 2.5],
    rateMul: [1, 1.15, 1.3],
  },
};

export const TOWER_ORDER = ['pulse', 'lance', 'frost'];

// Enemy kinds. vr = inward speed (px/s), wa = angular speed (rad/s),
// dmg = core HP lost on arrival, reward = gold on kill.
export const ENEMIES = {
  drifter: { name: 'Drifter', hp: 30, vr: 17, wa: 0.22, dmg: 1, reward: 6, radius: 13, color: '#ff7a6b', score: 10 },
  swift: { name: 'Swift', hp: 16, vr: 26, wa: 0.55, dmg: 1, reward: 8, radius: 10, color: '#ffe066', score: 15 },
  bulwark: { name: 'Bulwark', hp: 150, vr: 9, wa: 0.13, dmg: 3, reward: 16, radius: 19, color: '#c98bff', score: 30 },
  splitter: { name: 'Splitter', hp: 44, vr: 13, wa: 0.3, dmg: 2, reward: 10, radius: 15, color: '#7dffb0', score: 20 },
  mote: { name: 'Mote', hp: 10, vr: 30, wa: 0.6, dmg: 1, reward: 3, radius: 7, color: '#a8ffb0', score: 5 },
  warden: { name: 'Warden', hp: 1100, vr: 7, wa: 0.1, dmg: 5, reward: 120, radius: 30, color: '#ff4d6d', score: 250 },
};

// How a wave is built from its number. Counts grow, new kinds join in, and
// every fifth wave ends in a Warden.
export function waveComposition(n) {
  const list = [];
  const add = (type, count) => { if (count > 0) list.push({ type, count }); };
  add('drifter', 5 + Math.floor(n * 2.2));
  if (n >= 2) add('swift', 2 + Math.floor(n * 1.2));
  if (n >= 3) add('bulwark', Math.floor((n - 1) / 1.5));
  if (n >= 4) add('splitter', 1 + Math.floor((n - 2) / 1.5));
  if (n % 5 === 0) add('warden', 1);
  return list;
}

// Enemy HP grows with the wave — gently at first, then steeply, so the
// late campaign outpaces a wall of level-1 towers and upgrades matter.
export function waveHpMul(n) {
  const k = n - 1;
  return 1 + 0.22 * k + 0.012 * k * k;
}

// Enemies also hurry a little more each wave.
export function waveSpeedMul(n) {
  return 1 + 0.02 * (n - 1);
}

// Seconds between spawns inside a wave; tightens as waves climb.
export function spawnInterval(n) {
  return Math.max(0.3, 1.05 - n * 0.045);
}

export function waveClearBonus(n) {
  return 20 + 4 * n;
}

// Palette: one deep-space night, warm core light against cold orbit rings.
export const PALETTE = {
  bg0: '#070a18',
  bg1: '#0d1330',
  bg2: '#141b3d',
  ring: '#2a3568',
  ringGlow: '#3d4f9e',
  slot: '#232c52',
  slotHover: '#33407a',
  core: '#ffd166',
  coreHot: '#ff9e4d',
  hud: '#e8ecff',
  hudDim: '#9aa5d6',
  gold: '#ffd166',
  danger: '#ff5d73',
  panel: 'rgba(10, 14, 34, 0.88)',
  panelEdge: '#39448a',
};
