// Orbitward — every pixel the player sees. Canvas 2D on a 1280x720 logical
// stage: the starfield, the orbit rings, the core, towers, enemies,
// projectiles and particles, plus the HUD, the build palette, the banners
// and the title / victory / defeat screens.
import {
  VIEW_W, VIEW_H, CX, CY, CORE_R, CORE_MAX_HP, TOTAL_WAVES, RINGS,
  TOWERS, TOWER_ORDER, PALETTE,
} from './config.js';
import { slotPosition, towerDamage, towerRate, upgradeCost } from './towers.js';
import { LAYOUT } from './layout.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawBackground(ctx, game) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.bg0);
  grad.addColorStop(0.55, PALETTE.bg1);
  grad.addColorStop(1, PALETTE.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Two soft nebula blobs for depth.
  const neb1 = ctx.createRadialGradient(220, 140, 10, 220, 140, 340);
  neb1.addColorStop(0, 'rgba(90, 60, 160, 0.20)');
  neb1.addColorStop(1, 'rgba(90, 60, 160, 0)');
  ctx.fillStyle = neb1;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const neb2 = ctx.createRadialGradient(1080, 600, 10, 1080, 600, 360);
  neb2.addColorStop(0, 'rgba(30, 120, 140, 0.16)');
  neb2.addColorStop(1, 'rgba(30, 120, 140, 0)');
  ctx.fillStyle = neb2;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Twinkling stars.
  for (const s of game.stars) {
    const a = 0.35 + 0.4 * Math.abs(Math.sin(game.time * s.speed + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRings(ctx, game) {
  for (let r = 0; r < RINGS.length; r++) {
    const ring = RINGS[r];
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    // A faint glow arc that slowly travels the ring.
    const a0 = game.time * 0.12 + r * 2.1;
    ctx.strokeStyle = 'rgba(120, 150, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CX, CY, ring.r, a0, a0 + 0.9);
    ctx.stroke();
  }
}

function drawSlots(ctx, game) {
  for (let r = 0; r < RINGS.length; r++) {
    for (let s = 0; s < RINGS[r].slots; s++) {
      const pos = slotPosition(r, s);
      const occupied = game.towers.some((t) => t.ringIndex === r && t.slotIndex === s);
      if (occupied) continue;
      const isHover = game.hover && game.hover.kind === 'slot' && game.hover.ring === r && game.hover.slot === s;
      const isSel = game.selected && game.selected.kind === 'slot' && game.selected.ring === r && game.selected.slot === s;
      ctx.fillStyle = isSel ? '#4a5cb8' : isHover ? PALETTE.slotHover : PALETTE.slot;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSel ? 15 : 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSel ? '#8fa2ff' : 'rgba(160, 175, 255, 0.35)';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();
      if (isSel || isHover) {
        ctx.fillStyle = '#8fa2ff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', pos.x, pos.y + 0.5);
      }
    }
  }
}

function drawCore(ctx, game) {
  const pulse = 1 + 0.05 * Math.sin(game.time * 2.2);
  const hpFrac = Math.max(0, game.coreHp / CORE_MAX_HP);
  const dead = game.coreHp <= 0;
  const glow = ctx.createRadialGradient(CX, CY, 4, CX, CY, CORE_R * 2.4 * pulse);
  if (dead) {
    glow.addColorStop(0, 'rgba(120, 120, 140, 0.5)');
    glow.addColorStop(0.45, 'rgba(90, 90, 120, 0.18)');
    glow.addColorStop(1, 'rgba(90, 90, 120, 0)');
  } else {
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.85)');
    glow.addColorStop(0.45, 'rgba(255, 158, 77, 0.28)');
    glow.addColorStop(1, 'rgba(255, 158, 77, 0)');
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // The orb itself — cold grey once the core has fallen.
  const orb = ctx.createRadialGradient(CX - 12, CY - 14, 4, CX, CY, CORE_R);
  if (dead) {
    orb.addColorStop(0, '#9a9aad');
    orb.addColorStop(0.55, '#6a6a80');
    orb.addColorStop(1, '#43435a');
  } else {
    orb.addColorStop(0, '#fff3c4');
    orb.addColorStop(0.55, PALETTE.core);
    orb.addColorStop(1, PALETTE.coreHot);
  }
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Rotating shield arcs.
  ctx.strokeStyle = 'rgba(255, 220, 130, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const a0 = game.time * 0.5 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(CX, CY, CORE_R + 12, a0, a0 + 1.1);
    ctx.stroke();
  }

  // HP ring: the core's health as an arc around it.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R + 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.5 ? '#7dffb0' : hpFrac > 0.25 ? '#ffd166' : '#ff5d73';
  ctx.beginPath();
  ctx.arc(CX, CY, CORE_R + 22, -Math.PI / 2, -Math.PI / 2 + hpFrac * Math.PI * 2);
  ctx.stroke();

  text(ctx, 'CORE', CX, CY - 4, 13, '#5a3a00');
  text(ctx, `${game.coreHp}`, CX, CY + 13, 20, '#5a3a00');
}

function drawEnemyShape(ctx, enemy) {
  const { x, y } = enemy;
  const r = enemy.def.radius;
  const rot = enemy.angle + Math.PI / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.def.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (enemy.type === 'drifter') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, r * 0.7);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(-r * 0.85, r * 0.7);
    ctx.closePath();
  } else if (enemy.type === 'swift') {
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r * 0.7, r * 0.8);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(-r * 0.7, r * 0.8);
    ctx.closePath();
  } else if (enemy.type === 'bulwark') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (enemy.type === 'splitter') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
  } else if (enemy.type === 'warden') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 === 0 ? r * 1.25 : r * 0.7;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Slow tint, using the clock draw() stored in gameTimeNow.
  if (enemy.slowUntil > gameTimeNow) {
    ctx.strokeStyle = '#a78bff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // HP bar when hurt.
  if (enemy.hp < enemy.maxHp) {
    const w = r * 2;
    const frac = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - r - 12, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7dffb0' : frac > 0.25 ? '#ffd166' : '#ff5d73';
    ctx.fillRect(x - w / 2, y - r - 12, w * frac, 5);
  }
}

// The game's clock, stored by draw() so the shape routines can read it.
let gameTimeNow = 0;

function drawTower(ctx, tower, game) {
  const def = tower.def;
  // Range preview for the selected or hovered tower.
  const isSel = game.selected && game.selected.kind === 'tower' && game.selected.tower === tower;
  const isHover = game.hover && game.hover.kind === 'tower' && game.hover.tower === tower;
  if (isSel || isHover) {
    ctx.fillStyle = 'rgba(140, 170, 255, 0.08)';
    ctx.strokeStyle = 'rgba(160, 180, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, def.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Base.
  ctx.fillStyle = '#1b2247';
  ctx.strokeStyle = isSel ? '#8fa2ff' : def.glow;
  ctx.lineWidth = isSel ? 3 : 2;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Barrel toward the aim.
  ctx.strokeStyle = def.color;
  ctx.lineWidth = tower.kind === 'lance' ? 5 : 3.5;
  ctx.beginPath();
  ctx.moveTo(tower.x, tower.y);
  ctx.lineTo(tower.x + Math.cos(tower.aimAngle) * 20, tower.y + Math.sin(tower.aimAngle) * 20);
  ctx.stroke();

  // Kind glyph.
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.kind === 'frost' ? 5 : 6.5, 0, Math.PI * 2);
  ctx.fill();
  if (tower.kind === 'frost') {
    ctx.strokeStyle = '#e6dcff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(tower.x - Math.cos(a) * 9, tower.y - Math.sin(a) * 9);
      ctx.lineTo(tower.x + Math.cos(a) * 9, tower.y + Math.sin(a) * 9);
      ctx.stroke();
    }
  }

  // Muzzle flash.
  if (tower.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(tower.x + Math.cos(tower.aimAngle) * 22, tower.y + Math.sin(tower.aimAngle) * 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Level pips.
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(tower.x - 8 + i * 8, tower.y + 22, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectiles(ctx, game) {
  for (const p of game.projectiles) {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.kind === 'lance' ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawFx(ctx, game) {
  for (const p of game.fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of game.fx.texts) {
    ctx.globalAlpha = Math.min(1, t.life * 1.4);
    text(ctx, t.text, t.x, t.y, 15, t.color);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game, muted) {
  // Top bar.
  ctx.fillStyle = 'rgba(8, 11, 28, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, LAYOUT.topH);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, LAYOUT.topH + 0.5);
  ctx.lineTo(VIEW_W, LAYOUT.topH + 0.5);
  ctx.stroke();

  text(ctx, 'ORBITWARD', 16, 29, 20, PALETTE.hud, 'left');
  text(ctx, `WAVE ${Math.max(1, game.wave)}/${TOTAL_WAVES}`, 190, 29, 17, game.phase === 'wave' ? '#ffb347' : PALETTE.hudDim, 'left');
  text(ctx, `◉ ${game.gold}`, 330, 29, 18, PALETTE.gold, 'left');
  text(ctx, `SCORE ${game.score}`, 470, 29, 17, PALETTE.hud, 'left');
  text(ctx, `BEST ${Math.max(game.best.score, game.score)}`, 640, 29, 15, PALETTE.hudDim, 'left');

  // Core HP bar, top centre-right.
  const hpFrac = Math.max(0, game.coreHp / CORE_MAX_HP);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 800, 16, 130, 24, 6);
  ctx.fill();
  ctx.fillStyle = hpFrac > 0.5 ? '#7dffb0' : hpFrac > 0.25 ? '#ffd166' : '#ff5d73';
  roundRect(ctx, 802, 18, 126 * hpFrac, 20, 5);
  ctx.fill();
  text(ctx, `CORE ${game.coreHp}/${CORE_MAX_HP}`, 865, 29, 13, '#0a0e22');

  // Wave progress while a wave runs.
  if (game.phase === 'wave') {
    const remaining = game.enemies.length + (game.spawnQueue ? game.spawnQueue.types.length - game.spawnQueue.index : 0);
    const total = (game.spawnQueue ? game.spawnQueue.types.length : 0) + game.enemies.length;
    const cleared = Math.max(0, total - remaining);
    const frac = total > 0 ? cleared / total : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, 940, 20, 96, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#6fe3ff';
    roundRect(ctx, 940, 20, 96 * frac, 10, 5);
    ctx.fill();
  }

  // Top-right buttons.
  const speed = LAYOUT.speedBtn;
  ctx.fillStyle = '#232c52';
  roundRect(ctx, speed.x, speed.y, speed.w, speed.h, 7);
  ctx.fill();
  text(ctx, game.speed === 1 ? '1×' : '2×', speed.x + speed.w / 2, speed.y + 19, 16, PALETTE.hud);
  const pause = LAYOUT.pauseBtn;
  ctx.fillStyle = '#232c52';
  roundRect(ctx, pause.x, pause.y, pause.w, pause.h, 7);
  ctx.fill();
  text(ctx, game.paused ? '▶' : '❚❚', pause.x + pause.w / 2, pause.y + 19, 14, PALETTE.hud);
  const mute = LAYOUT.muteBtn;
  ctx.fillStyle = '#232c52';
  roundRect(ctx, mute.x, mute.y, mute.w, mute.h, 7);
  ctx.fill();
  text(ctx, muted ? 'MUTE' : 'SOUND', mute.x + mute.w / 2, mute.y + 19, 12, muted ? PALETTE.hudDim : PALETTE.hud);
}

function drawBottomBar(ctx, game) {
  // Bottom bar.
  ctx.fillStyle = 'rgba(8, 11, 28, 0.82)';
  ctx.fillRect(0, LAYOUT.bottomY, VIEW_W, LAYOUT.bottomH);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.beginPath();
  ctx.moveTo(0, LAYOUT.bottomY + 0.5);
  ctx.lineTo(VIEW_W, LAYOUT.bottomY + 0.5);
  ctx.stroke();

  // Build palette cards.
  for (const card of LAYOUT.palette) {
    const def = TOWERS[card.kind];
    const selected = game.buildKind === card.kind;
    const afford = game.gold >= def.cost;
    ctx.fillStyle = selected ? '#2c3a75' : '#1b2247';
    roundRect(ctx, card.x, card.y, card.w, card.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? def.color : '#39448a';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    roundRect(ctx, card.x, card.y, card.w, card.h, 8);
    ctx.stroke();
    text(ctx, `${def.name}  [${TOWER_ORDER.indexOf(card.kind) + 1}]`, card.x + card.w / 2, card.y + 15, 14, afford ? PALETTE.hud : '#7a84b8');
    text(ctx, def.blurb, card.x + card.w / 2, card.y + 32, 10.5, PALETTE.hudDim);
    text(ctx, `◉ ${def.cost}`, card.x + card.w / 2, card.y + 45, 11, afford ? PALETTE.gold : '#8a6a4d');
  }

  // Wave control, bottom right.
  const btn = LAYOUT.startWaveBtn;
  if (game.phase === 'build') {
    const next = game.wave + 1;
    ctx.fillStyle = next > TOTAL_WAVES ? '#2c3a75' : '#c98a1e';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 9);
    ctx.fill();
    text(ctx, `▶ START WAVE ${next}`, btn.x + btn.w / 2, btn.y + 21, 17, '#fff7e0');
    text(ctx, 'Space', btn.x + btn.w / 2, btn.y + 40, 11, 'rgba(255,247,224,0.75)');
  } else {
    ctx.fillStyle = '#1b2247';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 9);
    ctx.fill();
    ctx.strokeStyle = '#39448a';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 9);
    ctx.stroke();
    text(ctx, `WAVE ${game.wave} IN PROGRESS`, btn.x + btn.w / 2, btn.y + 21, 14, PALETTE.hudDim);
    text(ctx, `${game.enemies.length} hostiles on the field`, btn.x + btn.w / 2, btn.y + 40, 11, PALETTE.hudDim);
  }

  // Hint line, bottom centre.
  if (game.hint && game.time < game.hintUntil) {
    text(ctx, game.hint, 640, 622, 15, '#ffd166');
  } else if (game.phase === 'build') {
    text(ctx, 'Click a glowing slot to build · click a tower to upgrade or sell · 1/2/3 pick a tower', 640, 622, 13, PALETTE.hudDim);
  }
}

function drawSelectedPanel(ctx, game) {
  const sel = game.selected;
  if (!sel) return;
  const panel = LAYOUT.panel;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
  ctx.stroke();

  if (sel.kind === 'slot') {
    text(ctx, 'EMPTY SLOT', panel.x + 20, panel.y + 24, 16, PALETTE.hud, 'left');
    text(ctx, 'Pick a tower below to build it here.', panel.x + 20, panel.y + 48, 12.5, PALETTE.hudDim, 'left');
    const def = TOWERS[game.buildKind];
    text(ctx, `${def.name} — ${def.blurb}`, panel.x + 20, panel.y + 74, 13, def.color, 'left');
    text(ctx, `Damage ${def.dmg} · Rate ${def.rate}/s`, panel.x + 20, panel.y + 96, 12.5, PALETTE.hud, 'left');
    text(ctx, `Range ${def.range} · Cost ◉ ${def.cost}`, panel.x + 20, panel.y + 116, 12.5, PALETTE.hud, 'left');
    text(ctx, game.gold >= def.cost ? 'Click its card below to build' : 'Not enough gold yet', panel.x + 20, panel.y + 142, 12.5, game.gold >= def.cost ? '#7dffb0' : '#ff8a9a', 'left');
    return;
  }

  const tower = sel.tower;
  const def = tower.def;
  text(ctx, `${def.name.toUpperCase()}  ·  LV ${tower.level}`, panel.x + 20, panel.y + 24, 16, def.color, 'left');
  text(ctx, `Damage ${towerDamage(tower)} · Rate ${towerRate(tower).toFixed(1)}/s`, panel.x + 20, panel.y + 48, 12.5, PALETTE.hud, 'left');
  text(ctx, `Range ${def.range} · Kills ${tower.kills}`, panel.x + 20, panel.y + 68, 12.5, PALETTE.hud, 'left');
  text(ctx, `Invested ◉ ${tower.invested}`, panel.x + 20, panel.y + 88, 12.5, PALETTE.hudDim, 'left');
  const cost = upgradeCost(tower);
  const up = LAYOUT.upgradeBtn;
  ctx.fillStyle = cost !== null && game.gold >= cost ? '#2c6e4a' : '#26304f';
  roundRect(ctx, up.x, up.y, up.w, up.h, 7);
  ctx.fill();
  text(ctx, cost !== null ? `UPGRADE ◉ ${cost} [U]` : 'MAX LEVEL', up.x + up.w / 2, up.y + 21, 12.5, cost !== null && game.gold >= cost ? '#d8ffe9' : PALETTE.hudDim);
  const sell = LAYOUT.sellBtn;
  ctx.fillStyle = '#5a2c3d';
  roundRect(ctx, sell.x, sell.y, sell.w, sell.h, 7);
  ctx.fill();
  text(ctx, `SELL +${Math.floor(tower.invested * 0.7)} [X]`, sell.x + sell.w / 2, sell.y + 21, 12.5, '#ffd9e0');
}

function drawBanner(ctx, game) {
  if (!game.banner || game.time > game.bannerUntil) return;
  const remain = game.bannerUntil - game.time;
  const alpha = Math.min(1, remain * 2);
  ctx.globalAlpha = alpha;
  text(ctx, game.banner.text, CX, 130, 44, '#ffffff');
  if (game.banner.sub) text(ctx, game.banner.sub, CX, 168, 18, PALETTE.hudDim);
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, game) {
  // Decorative drifters orbiting the title.
  for (const d of game.decor) {
    const a = d.angle + game.time * d.wa;
    const x = CX + Math.cos(a) * d.r;
    const y = CY + Math.sin(a) * d.r;
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  text(ctx, 'ORBITWARD', CX, 190, 72, '#ffffff');
  text(ctx, 'HOLD THE CORE', CX, 246, 26, PALETTE.gold);
  text(ctx, 'Twenty waves spiral in from the dark. Build towers on the orbit rings,', CX, 300, 17, PALETTE.hud, 'center', 'normal');
  text(ctx, 'spend gold on upgrades, and do not let a single hostile touch the core.', CX, 326, 17, PALETTE.hud, 'center', 'normal');

  // How to play, three columns — kept clear of the core (its glow reaches
  // y≈428) and of the START button below.
  const cols = [
    ['1 · BUILD', 'Click a glowing slot,', 'pick Pulse, Lance or Frost.'],
    ['2 · SURVIVE', 'Start the wave. Kills pay', 'gold — upgrade, don\'t hoard.'],
    ['3 · HOLD', '20 waves, a Warden every', 'fifth. Lose the core, lose all.'],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 300 + i * 340;
    text(ctx, cols[i][0], x, 458, 16, '#6fe3ff');
    text(ctx, cols[i][1], x, 484, 14, PALETTE.hudDim, 'center', 'normal');
    text(ctx, cols[i][2], x, 506, 14, PALETTE.hudDim, 'center', 'normal');
  }

  const btn = LAYOUT.titleStartBtn;
  const pulse = 1 + 0.03 * Math.sin(game.time * 3);
  ctx.save();
  ctx.translate(CX, btn.y + btn.h / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#c98a1e';
  roundRect(ctx, -btn.w / 2, -btn.h / 2, btn.w, btn.h, 10);
  ctx.fill();
  text(ctx, '▶  START GAME', 0, 2, 22, '#fff7e0');
  ctx.restore();
  text(ctx, 'or press Space', CX, btn.y + btn.h + 22, 13, PALETTE.hudDim);
  if (game.best.score > 0) {
    text(ctx, `Best run: ${game.best.score} points · wave ${game.best.wave}`, CX, 662, 15, PALETTE.gold);
  }
  text(ctx, 'Mouse to build · Space to start a wave · P pause · F fast-forward · M mute', CX, 690, 13, PALETTE.hudDim);
}

function drawEndScreen(ctx, game, won) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const title = won ? 'VICTORY — THE CORE HOLDS' : 'THE CORE HAS FALLEN';
  const color = won ? '#7dffb0' : '#ff5d73';
  text(ctx, title, CX, 168, 44, color);
  text(
    ctx,
    won
      ? 'Twenty waves broken against your rings. The night is yours.'
      : 'The swarm reached the heart of the station. Rebuild the rings.',
    CX, 216, 17, PALETTE.hud, 'center', 'normal',
  );

  const rows = [
    ['FINAL SCORE', `${game.score}`],
    ['WAVE REACHED', `${game.wave} / ${TOTAL_WAVES}`],
    ['HOSTILES DESTROYED', `${game.kills}`],
    ['GOLD EARNED', `◉ ${game.goldEarned}`],
    ['TOWERS BUILT', `${game.towersBuilt}`],
    ['CORE REMAINING', `${game.coreHp} / ${CORE_MAX_HP}`],
  ];
  let y = 268;
  for (const [label, value] of rows) {
    text(ctx, label, CX - 180, y, 16, PALETTE.hudDim, 'left', 'normal');
    text(ctx, value, CX + 180, y, 18, PALETTE.hud, 'right');
    y += 34;
  }
  if (game.newBest) {
    text(ctx, '★ NEW BEST SCORE ★', CX, y + 8, 18, PALETTE.gold);
  }

  const btn = LAYOUT.endRestartBtn;
  ctx.fillStyle = '#c98a1e';
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
  ctx.fill();
  text(ctx, '↻  PLAY AGAIN', btn.x + btn.w / 2, btn.y + 29, 20, '#fff7e0');
  text(ctx, 'or press Space', CX, btn.y + btn.h + 22, 13, PALETTE.hudDim);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(4, 6, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', CX, 330, 44, '#ffffff');
  text(ctx, 'Press P or click ❚❚ to resume', CX, 380, 16, PALETTE.hudDim);
}

export function draw(ctx, game, muted) {
  gameTimeNow = game.time;
  ctx.save();
  ctx.translate(game.fx.shakeX, game.fx.shakeY);
  drawBackground(ctx, game);
  drawRings(ctx, game);
  if (game.screen === 'title') {
    drawSlots(ctx, game);
    drawCore(ctx, game);
    drawTitle(ctx, game);
    ctx.restore();
    return;
  }
  drawSlots(ctx, game);
  drawCore(ctx, game);
  for (const tower of game.towers) drawTower(ctx, tower, game);
  for (const enemy of game.enemies) drawEnemyShape(ctx, enemy);
  drawProjectiles(ctx, game);
  drawFx(ctx, game);
  ctx.restore();

  // End screens stand alone: the field stays as a backdrop, but the HUD,
  // the build bar and any banner are hidden so the result reads cleanly.
  if (game.screen === 'victory') {
    drawEndScreen(ctx, game, true);
    return;
  }
  if (game.screen === 'defeat') {
    drawEndScreen(ctx, game, false);
    return;
  }

  drawHud(ctx, game, muted);
  drawBottomBar(ctx, game);
  drawSelectedPanel(ctx, game);
  drawBanner(ctx, game);

  if (game.paused) drawPaused(ctx);
}
