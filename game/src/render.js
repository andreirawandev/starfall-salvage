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
  text(ctx, `WAVE ${world.wave}`, VIEW.width / 2, 24, 20, PALETTE.accent, 'center');
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
  text(ctx, 'STARFALL', VIEW.width / 2, 158, 64, PALETTE.ship, 'center', 'bold');
  text(ctx, 'SALVAGE', VIEW.width / 2, 218, 64, PALETTE.gold, 'center', 'bold');
  text(ctx, 'Collect the cores. Blast the drones. Survive the waves.', VIEW.width / 2, 268, 17, PALETTE.hudText, 'center', 'normal');
  text(ctx, 'WASD / arrows — fly      Mouse — aim      Click / Space — fire', VIEW.width / 2, 308, 15, PALETTE.hudDim, 'center', 'normal');
  text(ctx, 'Clear a wave to pick an upgrade. Three hits and your run ends.', VIEW.width / 2, 334, 15, PALETTE.hudDim, 'center', 'normal');
  const blink = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'PRESS ENTER TO LAUNCH', VIEW.width / 2, 384, 22, PALETTE.accent, 'center', 'bold');
  ctx.restore();
  if (world.best > 0) {
    text(ctx, `BEST SCORE  ${world.best.toLocaleString('en-US')}`, VIEW.width / 2, 446, 15, PALETTE.gold, 'center', 'bold');
  }
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
    text(ctx, `[${i + 1}]`, x + cardW / 2, y0 + 30, 16, PALETTE.accent, 'center', 'bold');
    text(ctx, u.name, x + cardW / 2, y0 + 66, 20, PALETTE.hudText, 'center', 'bold');
    // Wrap the blurb to two lines by hand: it is short by design.
    const words = u.blurb.split(' ');
    const mid = Math.ceil(words.length / 2);
    text(ctx, words.slice(0, mid).join(' '), x + cardW / 2, y0 + 106, 14, PALETTE.hudDim, 'center', 'normal');
    text(ctx, words.slice(mid).join(' '), x + cardW / 2, y0 + 130, 14, PALETTE.hudDim, 'center', 'normal');
    text(ctx, 'click or press ' + (i + 1), x + cardW / 2, y0 + 164, 12, PALETTE.hudDim, 'center', 'normal');
  });
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}   ·   SALVAGE ${world.salvageCollected}`, VIEW.width / 2, y0 + cardH + 46, 16, PALETTE.hudText, 'center', 'bold');
}

export function drawGameOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  panel(ctx, VIEW.width / 2 - 300, 108, 600, 300);
  text(ctx, 'SIGNAL LOST', VIEW.width / 2, 168, 52, PALETTE.danger, 'center', 'bold');
  text(ctx, 'Your skiff broke apart in the debris field.', VIEW.width / 2, 214, 16, PALETTE.hudText, 'center', 'normal');
  text(ctx, `FINAL SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.width / 2, 262, 24, PALETTE.gold, 'center', 'bold');
  text(ctx, `WAVE ${world.wave}   ·   SALVAGE ${world.salvageCollected}   ·   DRONES DOWN ${world.kills}`, VIEW.width / 2, 298, 15, PALETTE.hudDim, 'center', 'normal');
  if (world.score >= world.best && world.score > 0) {
    text(ctx, 'NEW BEST SCORE', VIEW.width / 2, 330, 16, PALETTE.accent, 'center', 'bold');
  }
  const blink = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'PRESS ENTER TO FLY AGAIN', VIEW.width / 2, 372, 20, PALETTE.accent, 'center', 'bold');
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
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'upgrade') drawUpgrade(ctx, world);
  if (world.state === 'gameover') drawGameOver(ctx, world);
  if (world.state === 'paused') drawPaused(ctx, world);
}
