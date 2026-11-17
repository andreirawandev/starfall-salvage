// Starfall Salvage — everything the player sees.
// Every draw call goes through the canvas 2D context passed in, so the
// same code renders the live game and the posed screenshot states.

import { VIEW, PALETTE, PLAYER } from './config.js';
import { enemyColor } from './world.js';

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function glowCircle(ctx, x, y, r, color, alpha = 0.25) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  circle(ctx, x, y, r * 2.1);
  ctx.restore();
}

function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.save();
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.backgroundTop);
  g.addColorStop(1, PALETTE.backgroundBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (const n of world.nebulas) {
    const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    rg.addColorStop(0, n.color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = rg;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    ctx.restore();
  }
  for (const s of world.stars) {
    const tw = 0.5 + 0.5 * Math.sin(world.time * 1.6 + s.tw);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * tw * s.z;
    ctx.fillStyle = PALETTE.star;
    ctx.fillRect(s.x, s.y, s.size, s.size);
    ctx.restore();
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.state === 'gameover') return;
  if (p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0) return; // blink while invulnerable
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (p.thrusting) {
    ctx.fillStyle = '#ffb347';
    poly(ctx, [[-PLAYER.radius - 2, -5], [-PLAYER.radius - 14 - Math.random() * 6, 0], [-PLAYER.radius - 2, 5]]);
  }
  glowCircle(ctx, 0, 0, PLAYER.radius, PALETTE.ship, 0.22);
  ctx.fillStyle = PALETTE.ship;
  poly(ctx, [[PLAYER.radius + 4, 0], [-PLAYER.radius, -10], [-PLAYER.radius * 0.55, 0], [-PLAYER.radius, 10]]);
  ctx.fillStyle = PALETTE.shipCore;
  poly(ctx, [[PLAYER.radius * 0.55, 0], [-PLAYER.radius * 0.4, -4.5], [-PLAYER.radius * 0.4, 4.5]]);
  ctx.restore();
  if (p.shield && !p.shieldUsed) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.12 * Math.sin(world.time * 4);
    ctx.strokeStyle = PALETTE.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(ctx, e) {
  const color = enemyColor(e.type);
  ctx.save();
  ctx.translate(e.x, e.y);
  glowCircle(ctx, 0, 0, e.r, color, 0.2);
  ctx.fillStyle = color;
  if (e.type === 'drifter') {
    ctx.rotate(e.t * 0.8);
    poly(ctx, [[0, -e.r], [e.r * 0.8, 0], [0, e.r], [-e.r * 0.8, 0]]);
    ctx.fillStyle = '#ffd7ea';
    poly(ctx, [[0, -e.r * 0.45], [e.r * 0.35, 0], [0, e.r * 0.45], [-e.r * 0.35, 0]]);
  } else if (e.type === 'chaser') {
    ctx.rotate(Math.atan2(e.vy, e.vx));
    poly(ctx, [[e.r + 2, 0], [-e.r, -e.r * 0.75], [-e.r * 0.4, 0], [-e.r, e.r * 0.75]]);
    ctx.fillStyle = '#ffe1b8';
    circle(ctx, e.r * 0.2, 0, 3);
  } else if (e.type === 'weaver') {
    const pulse = 1 + 0.12 * Math.sin(e.t * 5);
    ctx.scale(pulse, pulse);
    circle(ctx, 0, 0, e.r);
    ctx.fillStyle = '#e9dcff';
    circle(ctx, 0, 0, e.r * 0.45);
    ctx.fillStyle = '#2a1b5e';
    circle(ctx, -e.r * 0.3, -e.r * 0.2, 2.5);
    circle(ctx, e.r * 0.3, -e.r * 0.2, 2.5);
  } else if (e.type === 'splitter') {
    // Splitting hex: a green hex ring with a bright core that cracks apart.
    ctx.rotate(e.t * 0.7);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * e.r;
      const y = Math.sin(a) * e.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dcffe2';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * e.r * 0.45;
      const y = Math.sin(a) * e.r * 0.45;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // mine: spiked circle, pulsing
    const pulse = 1 + 0.18 * Math.sin(e.t * 4);
    ctx.rotate(e.t * 0.6);
    ctx.scale(pulse, pulse);
    const spikes = 8;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? e.r + 5 : e.r * 0.72;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd2d2';
    circle(ctx, 0, 0, e.r * 0.4);
  }
  ctx.restore();
  // Health pips for tougher enemies.
  if (e.maxHp > 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(232,241,255,0.85)';
    for (let i = 0; i < e.maxHp; i++) {
      const x = e.x - ((e.maxHp - 1) * 7) / 2 + i * 7;
      ctx.globalAlpha = i < e.hp ? 0.9 : 0.25;
      ctx.fillRect(x - 2.5, e.y - e.r - 11, 5, 3);
    }
    ctx.restore();
  }
}

function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    // Streak trail behind the bolt so fire reads at a glance.
    ctx.save();
    ctx.strokeStyle = PALETTE.bullet;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    glowCircle(ctx, b.x, b.y, b.r, PALETTE.bullet, 0.35);
    ctx.fillStyle = PALETTE.bullet;
    circle(ctx, b.x, b.y, b.r);
    ctx.fillStyle = PALETTE.bulletCore;
    circle(ctx, b.x, b.y, b.r * 0.45);
  }
  for (const b of world.enemyBullets) {
    glowCircle(ctx, b.x, b.y, b.r, PALETTE.enemyBullet, 0.3);
    ctx.fillStyle = PALETTE.enemyBullet;
    circle(ctx, b.x, b.y, b.r);
    ctx.fillStyle = '#ffe3f6';
    circle(ctx, b.x, b.y, b.r * 0.45);
  }
}

function drawSalvage(ctx, world) {
  for (const s of world.salvage) {
    const bob = Math.sin(s.t * 4) * 2;
    glowCircle(ctx, s.x, s.y + bob, 7, PALETTE.salvage, 0.35);
    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.rotate(s.t * 1.5);
    ctx.fillStyle = PALETTE.salvage;
    poly(ctx, [[0, -7], [5, 0], [0, 7], [-5, 0]]);
    ctx.fillStyle = PALETTE.salvageCore;
    poly(ctx, [[0, -3.5], [2.5, 0], [0, 3.5], [-2.5, 0]]);
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    ctx.restore();
  }
}

function drawFloats(ctx, world) {
  for (const f of world.floats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / 1.1);
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center', 'bold');
    ctx.restore();
  }
}

function drawHull(ctx, x, y, hull, maxHull) {
  for (let i = 0; i < maxHull; i++) {
    ctx.save();
    ctx.translate(x + i * 24, y);
    ctx.fillStyle = i < hull ? '#ff6b81' : 'rgba(143,163,200,0.35)';
    // Small heart: two circles plus a triangle.
    ctx.beginPath();
    ctx.arc(-4, -2, 4.5, 0, Math.PI * 2);
    ctx.arc(4, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [[-8, -1], [8, -1], [0, 9]]);
    ctx.restore();
  }
}

export function drawHUD(ctx, world) {
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(8, 11, 28, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, 46);
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}`, 16, 24, 20, PALETTE.hudText, 'left');
  text(ctx, `WAVE ${world.wave}`, VIEW.width / 2, 20, 20, PALETTE.accent, 'center');
  const dronesLeft = world.enemies.length + world.spawnQueue.length;
  text(ctx, `${dronesLeft} DRONE${dronesLeft === 1 ? '' : 'S'} LEFT`, VIEW.width / 2, 39, 11, PALETTE.hudDim, 'center');
  drawHull(ctx, VIEW.width - 16 - (world.player.maxHull - 1) * 24 - 8, 24, world.player.hull, world.player.maxHull);
  // Combo meter under the score.
  if (world.combo > 1) {
    const w = 110;
    const frac = world.comboTimer / 3;
    ctx.fillStyle = 'rgba(143,163,200,0.4)';
    ctx.fillRect(16, 52, w, 5);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(16, 52, w * frac, 5);
    text(ctx, `COMBO x${world.combo.toFixed(2)}`, 16, 70, 13, PALETTE.gold, 'left');
  }
  text(ctx, `SALVAGE ${world.salvageCollected}`, 16, VIEW.height - 16, 14, PALETTE.hudDim, 'left');
  text(ctx, 'WASD move · mouse aim · hold click to fire · P pause · M mute', VIEW.width - 16, VIEW.height - 16, 12, PALETTE.hudDim, 'right');
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawTitle(ctx, world) {
  panel(ctx, VIEW.width / 2 - 330, 92, 660, 330);
  text(ctx, 'A NEON ARENA SURVIVAL GAME', VIEW.width / 2, 126, 13, PALETTE.accent, 'center', 'bold');
  text(ctx, 'STARFALL', VIEW.width / 2, 168, 64, PALETTE.ship, 'center', 'bold');
  text(ctx, 'SALVAGE', VIEW.width / 2, 228, 64, PALETTE.gold, 'center', 'bold');
  text(ctx, 'Collect the cores. Blast the drones. Survive the waves.', VIEW.width / 2, 276, 17, PALETTE.hudText, 'center', 'normal');
  text(ctx, 'WASD / arrows — fly      Mouse — aim      Click / Space — fire', VIEW.width / 2, 312, 15, PALETTE.hudDim, 'center', 'normal');
  text(ctx, 'Clear a wave to pick an upgrade. Three hits and your run ends.', VIEW.width / 2, 336, 15, PALETTE.hudDim, 'center', 'normal');
  text(ctx, '5 drone types  ·  6 upgrades  ·  combos to x3.00', VIEW.width / 2, 362, 13, PALETTE.gold, 'center', 'bold');
  const blink = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'PRESS ENTER TO LAUNCH', VIEW.width / 2, 396, 22, PALETTE.accent, 'center', 'bold');
  ctx.restore();
  if (world.best > 0) {
    text(ctx, `BEST SCORE  ${world.best.toLocaleString('en-US')}`, VIEW.width / 2, 446, 15, PALETTE.gold, 'center', 'bold');
  }
}

// One small glyph per upgrade, drawn in the card above its name.
function drawUpgradeIcon(ctx, id, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = PALETTE.accent;
  ctx.fillStyle = PALETTE.accent;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (id === 'twin') {
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-9, 8); ctx.moveTo(9, -8); ctx.lineTo(9, 8); ctx.stroke();
    circle(ctx, -9, -8, 2.5); circle(ctx, 9, -8, 2.5);
  } else if (id === 'rapid') {
    for (const dx of [-10, 0, 10]) {
      ctx.beginPath(); ctx.moveTo(dx - 4, -7); ctx.lineTo(dx, 0); ctx.lineTo(dx - 4, 7); ctx.stroke();
    }
  } else if (id === 'pierce') {
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    poly(ctx, [[13, -5], [20, 0], [13, 5]]);
    circle(ctx, -5, 0, 3.5); circle(ctx, 5, 0, 3.5);
  } else if (id === 'hull') {
    ctx.beginPath(); ctx.arc(-4, -2, 4.5, 0, Math.PI * 2); ctx.arc(4, -2, 4.5, 0, Math.PI * 2); ctx.fill();
    poly(ctx, [[-8, -1], [8, -1], [0, 9]]);
  } else if (id === 'magnet') {
    ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-9, 8); ctx.moveTo(9, -2); ctx.lineTo(9, 8); ctx.stroke();
  } else if (id === 'shield') {
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export function drawUpgrade(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  text(ctx, `WAVE ${world.wave} CLEARED`, VIEW.width / 2, 84, 30, PALETTE.accent, 'center', 'bold');
  text(ctx, 'Choose one upgrade', VIEW.width / 2, 118, 17, PALETTE.hudText, 'center', 'normal');
  const cardW = 220;
  const cardH = 190;
  const gap = 26;
  const total = cardW * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 158;
  world.upgradeChoices.forEach((u, i) => {
    const x = x0 + i * (cardW + gap);
    ctx.save();
    ctx.fillStyle = PALETTE.card;
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x, y0, cardW, cardH);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, `[${i + 1}]`, x + cardW / 2, y0 + 26, 16, PALETTE.accent, 'center', 'bold');
    drawUpgradeIcon(ctx, u.id, x + cardW / 2, y0 + 54);
    text(ctx, u.name, x + cardW / 2, y0 + 90, 20, PALETTE.hudText, 'center', 'bold');
    // Wrap the blurb to two lines by hand: it is short by design.
    const words = u.blurb.split(' ');
    const mid = Math.ceil(words.length / 2);
    text(ctx, words.slice(0, mid).join(' '), x + cardW / 2, y0 + 122, 14, PALETTE.hudDim, 'center', 'normal');
    text(ctx, words.slice(mid).join(' '), x + cardW / 2, y0 + 144, 14, PALETTE.hudDim, 'center', 'normal');
    text(ctx, 'click or press ' + (i + 1), x + cardW / 2, y0 + 170, 12, PALETTE.hudDim, 'center', 'normal');
  });
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}   ·   SALVAGE ${world.salvageCollected}`, VIEW.width / 2, y0 + cardH + 46, 16, PALETTE.hudText, 'center', 'bold');
}

function rankForScore(score) {
  if (score >= 5000) return 'ACE SALVAGER';
  if (score >= 2500) return 'VETERAN SALVAGER';
  if (score >= 1200) return 'SEASONED SALVAGER';
  if (score >= 500) return 'ROOKIE SALVAGER';
  return 'GREENHORN';
}

export function drawGameOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  panel(ctx, VIEW.width / 2 - 300, 108, 600, 300);
  text(ctx, 'SIGNAL LOST', VIEW.width / 2, 168, 52, PALETTE.danger, 'center', 'bold');
  text(ctx, 'Your skiff broke apart in the debris field.', VIEW.width / 2, 212, 16, PALETTE.hudText, 'center', 'normal');
  text(ctx, `FINAL SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.width / 2, 256, 24, PALETTE.gold, 'center', 'bold');
  text(ctx, `WAVE ${world.wave}   ·   SALVAGE ${world.salvageCollected}   ·   DRONES DOWN ${world.kills}`, VIEW.width / 2, 292, 15, PALETTE.hudDim, 'center', 'normal');
  text(ctx, `RANK: ${rankForScore(world.score)}`, VIEW.width / 2, 322, 15, PALETTE.accent, 'center', 'bold');
  if (world.score >= world.best && world.score > 0) {
    text(ctx, 'NEW BEST SCORE', VIEW.width / 2, 348, 16, PALETTE.accent, 'center', 'bold');
  }
  const blink = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'PRESS ENTER TO FLY AGAIN', VIEW.width / 2, 382, 20, PALETTE.accent, 'center', 'bold');
  ctx.restore();
}

export function drawPaused(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  text(ctx, 'PAUSED', VIEW.width / 2, VIEW.height / 2 - 10, 44, PALETTE.hudText, 'center', 'bold');
  text(ctx, 'Press P to resume', VIEW.width / 2, VIEW.height / 2 + 34, 16, PALETTE.hudDim, 'center', 'normal');
}

function drawWaveBanner(ctx, world) {
  if (world.waveBanner <= 0 || world.state !== 'playing') return;
  const a = Math.min(1, world.waveBanner / 0.6) * Math.min(1, (2.0 - world.waveBanner) / 0.25 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  text(ctx, `WAVE ${world.wave}`, VIEW.width / 2, VIEW.height / 2 - 70, 46, PALETTE.accent, 'center', 'bold');
  text(ctx, 'CLEAR ALL DRONES', VIEW.width / 2, VIEW.height / 2 - 30, 15, PALETTE.hudText, 'center', 'bold');
  ctx.restore();
}

function drawCrosshair(ctx, world) {
  if (world.state !== 'playing') return;
  const x = world.aimX;
  const y = world.aimY;
  ctx.save();
  ctx.strokeStyle = PALETTE.accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 17, y); ctx.lineTo(x - 7, y);
  ctx.moveTo(x + 7, y); ctx.lineTo(x + 17, y);
  ctx.moveTo(x, y - 17); ctx.lineTo(x, y - 7);
  ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 17);
  ctx.stroke();
  ctx.fillStyle = PALETTE.accent;
  circle(ctx, x, y, 1.5);
  ctx.restore();
}

export function drawScene(ctx, world) {
  ctx.save();
  if (world.shake > 0.2) {
    const s = world.shake;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }
  drawBackground(ctx, world);
  drawSalvage(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, e);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloats(ctx, world);
  ctx.restore();
  if (world.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, world.flash);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.restore();
  }
  if (world.state === 'playing' || world.state === 'paused') drawHUD(ctx, world);
  if (world.state === 'playing') {
    drawWaveBanner(ctx, world);
    drawCrosshair(ctx, world);
  }
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'upgrade') drawUpgrade(ctx, world);
  if (world.state === 'gameover') drawGameOver(ctx, world);
  if (world.state === 'paused') drawPaused(ctx, world);
}
