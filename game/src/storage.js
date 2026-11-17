// Orbitward — best-run persistence. One localStorage key, guarded so a
// blocked or private browser never breaks the game.
const KEY = 'orbitward.best.v1';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    return {
      score: Number(parsed.score) || 0,
      wave: Number(parsed.wave) || 0,
    };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(score, wave) {
  try {
    const best = loadBest();
    if (score > best.score) {
      window.localStorage.setItem(KEY, JSON.stringify({ score, wave }));
      return true;
    }
  } catch {
    // Storage unavailable; the run still counts on screen.
  }
  return false;
}
