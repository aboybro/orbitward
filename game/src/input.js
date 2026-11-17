// Orbitward — keyboard and mouse input. The canvas scales to the window,
// so every pointer position is mapped back into the game's 1280x720 logical
// space before the game sees it. Handlers are registered by main.js; this
// module only normalises the events.
import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas, handlers) {
  const input = {
    mouseX: VIEW_W / 2,
    mouseY: VIEW_H / 2,
    mouseDown: false,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const scaleY = VIEW_H / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    if (handlers.onMove) handlers.onMove(p.x, p.y);
  });

  canvas.addEventListener('pointerdown', (event) => {
    input.mouseDown = true;
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    if (handlers.onClick) handlers.onClick(p.x, p.y, event.button);
    event.preventDefault();
  });

  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (handlers.onKey) handlers.onKey(event.key.toLowerCase(), event);
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}
