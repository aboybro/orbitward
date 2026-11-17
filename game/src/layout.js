// Orbitward — one source of truth for every clickable region on screen.
// render.js draws these rects and game.js tests clicks against them, so the
// picture and the hit-test can never drift apart.
export const LAYOUT = {
  topH: 56,
  bottomY: 628,
  bottomH: 76,
  // Top-right buttons.
  speedBtn: { x: 1052, y: 10, w: 64, h: 36 },
  pauseBtn: { x: 1124, y: 10, w: 44, h: 36 },
  muteBtn: { x: 1176, y: 10, w: 56, h: 36 },
  // Bottom-left build palette: one card per tower kind.
  palette: [
    { kind: 'pulse', x: 16, y: 636, w: 142, h: 52 },
    { kind: 'lance', x: 166, y: 636, w: 142, h: 52 },
    { kind: 'frost', x: 316, y: 636, w: 142, h: 52 },
  ],
  // Bottom-right wave control.
  startWaveBtn: { x: 1052, y: 636, w: 212, h: 52 },
  // Selected-tower panel, right side.
  panel: { x: 1004, y: 76, w: 260, h: 168 },
  upgradeBtn: { x: 1020, y: 188, w: 116, h: 40 },
  sellBtn: { x: 1144, y: 188, w: 104, h: 40 },
  // Screens.
  titleStartBtn: { x: 540, y: 540, w: 200, h: 56 },
  endRestartBtn: { x: 540, y: 528, w: 200, h: 56 },
};

export function inRect(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
