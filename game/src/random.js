// Orbitward — a tiny seeded RNG (mulberry32). Every roll in the game goes
// through this module so a screenshot scene can be replayed exactly: the
// live game seeds from the clock, shot mode seeds from the shot's seed.
let state = 1;

export function seedRandom(seed) {
  state = (seed >>> 0) || 1;
}

export function random() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(min, max) {
  return min + random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

export function pick(array) {
  return array[Math.floor(random() * array.length)];
}
