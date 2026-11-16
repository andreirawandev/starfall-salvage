// Starfall Salvage — the simulation.
// Pure logic: no DOM, no canvas, no audio. It takes an input snapshot
// each frame and pushes sound events into world.events for the caller
// to play. The same file runs in the browser and in the screenshot
// poser, so what the screenshots show is the real game.

import { VIEW, PLAYER, ENEMIES, WAVES, UPGRADES, SCORING, FX } from './config.js';
import { makeRng, range, pick } from './random.js';

export function createWorld(seed) {
  const rng = makeRng(seed);
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      z: 0.3 + rng() * 0.7,
      size: 0.6 + rng() * 1.6,
      tw: rng() * Math.PI * 2,
    });
  }
  const nebulas = [];
  for (let i = 0; i < 5; i++) {
    nebulas.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      r: 120 + rng() * 180,
      color: pick(rng, ['#2a1b5e', '#0f2a4a', '#3a1c5e']),
    });
  }
  return {
    rng,
    state: 'title',
    time: 0,
    stars,
    nebulas,
    player: freshPlayer(),
    bullets: [],
    enemyBullets: [],
    enemies: [],
    salvage: [],
    particles: [],
    floats: [],
    events: [],
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    score: 0,
    salvageCollected: 0,
    combo: 1,
    comboTimer: 0,
    kills: 0,
    shake: 0,
    flash: 0,
    upgradeChoices: [],
    best: 0,
  };
}

function freshPlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hull: PLAYER.maxHull,
    maxHull: PLAYER.maxHull,
    fireTimer: 0,
    invuln: 0,
    shots: 1,
    fireInterval: PLAYER.fireInterval,
    magnetRadius: PLAYER.magnetRadius,
    shield: false,
    shieldUsed: false,
    thrusting: false,
  };
}

export function startRun(world) {
  world.player = freshPlayer();
  world.bullets = [];
  world.enemyBullets = [];
  world.enemies = [];
  world.salvage = [];
  world.particles = [];
  world.floats = [];
  world.score = 0;
  world.salvageCollected = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.kills = 0;
  world.wave = 0;
  world.state = 'playing';
  world.shake = 0;
  world.flash = 0;
  beginWave(world);
}

function waveComposition(world, n) {
  const table = WAVES.table;
  const base = table[Math.min(n - 1, table.length - 1)];
  const comp = { ...base };
  if (n > table.length) comp.drifter += (n - table.length) * 2;
  return comp;
}

function beginWave(world) {
  world.wave += 1;
  const comp = waveComposition(world, world.wave);
  const queue = [];
  for (const [type, count] of Object.entries(comp)) {
    for (let i = 0; i < count; i++) queue.push(type);
  }
  // Shuffle so the wave never arrives in neat type blocks.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  world.spawnQueue = queue;
  world.spawnTimer = 0.4;
  world.betweenTimer = 0;
}

function spawnEnemy(world, type) {
  const def = ENEMIES[type];
  const speedScale = Math.min(1 + 0.03 * (world.wave - 1), 1.4);
  const edge = Math.floor(world.rng() * 4);
  let x;
  let y;
  const m = 30;
  if (edge === 0) { x = range(world.rng, m, VIEW.width - m); y = -m; }
  else if (edge === 1) { x = range(world.rng, m, VIEW.width - m); y = VIEW.height + m; }
  else if (edge === 2) { x = -m; y = range(world.rng, m, VIEW.height - m); }
  else { x = VIEW.width + m; y = range(world.rng, m, VIEW.height - m); }
  const a = Math.atan2(VIEW.height / 2 - y, VIEW.width / 2 - x);
  const enemy = {
    type,
    x, y,
    vx: Math.cos(a) * def.speed * speedScale,
    vy: Math.sin(a) * def.speed * speedScale,
    hp: def.hp,
    maxHp: def.hp,
    r: def.radius,
    t: 0,
    fireTimer: range(world.rng, 1.2, 2.4),
    baseSpeed: def.speed * speedScale,
    seed: world.rng() * Math.PI * 2,
  };
  world.enemies.push(enemy);
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, life: FX.floatTextLife });
}

function burst(world, x, y, color, count, speed = 180) {
  for (let i = 0; i < count; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(world.rng, 0.35, 0.8),
      maxLife: 0.8,
      size: range(world.rng, 1.5, 3.5),
      color,
    });
  }
  if (world.particles.length > 420) {
    world.particles.splice(0, world.particles.length - 420);
  }
}

function dropSalvage(world, x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, 30, 90);
    world.salvage.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      t: world.rng() * Math.PI * 2,
    });
  }
}

function killEnemy(world, enemy, index) {
  const def = ENEMIES[enemy.type];
  world.enemies.splice(index, 1);
  world.kills += 1;
  world.score += def.score;
  addFloat(world, enemy.x, enemy.y - 10, `+${def.score}`, '#e8f1ff');
  burst(world, enemy.x, enemy.y, enemyColor(enemy.type), FX.particlesPerExplosion);
  dropSalvage(world, enemy.x, enemy.y, def.salvage);
  world.events.push({ type: 'explosion', big: enemy.type === 'weaver' });
  if (enemy.type === 'mine') {
    // A mine's death is a blast: anything close takes a hit.
    world.shake = Math.max(world.shake, FX.shakeOnDeath);
    const p = world.player;
    const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    if (d < 110 && p.invuln <= 0) damagePlayer(world, 1, true);
    for (let i = world.enemies.length - 1; i >= 0; i--) {
      const other = world.enemies[i];
      if (Math.hypot(other.x - enemy.x, other.y - enemy.y) < 90) {
        other.hp -= 1;
        if (other.hp <= 0) killEnemy(world, other, i);
      }
    }
  }
}

export function enemyColor(type) {
  return { drifter: '#ff5da2', chaser: '#ff9f43', weaver: '#b388ff', mine: '#ff5252' }[type];
}

// End the run through the real damage path: the hull drains hit by
// hit, each with its invulnerability window reset, until the fatal
// blow puts the world in its game-over state. The screenshot poser
// uses this so the end screen shows a genuinely played run.
export function endRun(world) {
  const p = world.player;
  p.shield = false;
  p.shieldUsed = false;
  let guard = 0;
  while (p.hull > 0 && world.state === 'playing' && guard < 10) {
    p.invuln = 0;
    damagePlayer(world, 1);
    guard++;
  }
}

function damagePlayer(world, amount, fromBlast = false) {
  const p = world.player;
  if (p.invuln > 0 || world.state !== 'playing') return;
  if (p.shield && !p.shieldUsed) {
    p.shieldUsed = true;
    p.invuln = 1.0;
    world.events.push({ type: 'shield' });
    addFloat(world, p.x, p.y - 24, 'SHIELD', '#5ef2e2');
    burst(world, p.x, p.y, '#5ef2e2', 14, 140);
    return;
  }
  p.hull -= amount;
  p.invuln = PLAYER.invulnerableTime;
  world.combo = 1;
  world.comboTimer = 0;
  world.shake = Math.max(world.shake, FX.shakeOnHit);
  world.flash = 0.5;
  world.events.push({ type: 'hurt' });
  burst(world, p.x, p.y, '#ff5252', 18, 160);
  if (p.hull <= 0) {
    world.state = 'gameover';
    world.events.push({ type: 'gameOver' });
    burst(world, p.x, p.y, '#5ef2e2', 60, 260);
    burst(world, p.x, p.y, '#ffc53d', 30, 200);
    world.shake = FX.shakeOnDeath;
  }
}

function offerUpgrades(world) {
  const pool = [...UPGRADES];
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const i = Math.floor(world.rng() * pool.length);
    choices.push(pool.splice(i, 1)[0]);
  }
  world.upgradeChoices = choices;
  world.state = 'upgrade';
  world.events.push({ type: 'waveClear' });
}

export function applyUpgrade(world, index) {
  const choice = world.upgradeChoices[index];
  if (!choice || world.state !== 'upgrade') return;
  choice.apply(world.player);
  world.player.shieldUsed = false;
  world.events.push({ type: 'upgrade' });
  addFloat(world, world.player.x, world.player.y - 30, choice.name.toUpperCase(), '#5ef2e2');
  world.upgradeChoices = [];
  world.state = 'playing';
  world.betweenTimer = WAVES.betweenWaveDelay;
  world.spawnQueue = [];
  beginWave(world);
}

function stepPlayer(world, input, dt) {
  const p = world.player;
  const mv = input.move;
  p.vx += mv.x * PLAYER.accel * dt;
  p.vy += mv.y * PLAYER.accel * dt;
  const damp = Math.exp(-PLAYER.damping * dt);
  p.vx *= damp;
  p.vy *= damp;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > PLAYER.maxSpeed) {
    p.vx = (p.vx / speed) * PLAYER.maxSpeed;
    p.vy = (p.vy / speed) * PLAYER.maxSpeed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(PLAYER.radius, Math.min(VIEW.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(VIEW.height - PLAYER.radius, p.y));
  p.thrusting = mv.x !== 0 || mv.y !== 0;
  if (p.thrusting && world.rng() < 0.5) {
    world.particles.push({
      x: p.x - Math.cos(p.angle) * PLAYER.radius,
      y: p.y - Math.sin(p.angle) * PLAYER.radius,
      vx: -Math.cos(p.angle) * 60 + range(world.rng, -20, 20),
      vy: -Math.sin(p.angle) * 60 + range(world.rng, -20, 20),
      life: 0.3,
      maxLife: 0.3,
      size: 2,
      color: '#5ef2e2',
    });
  }
  // Aim at the mouse; the ship's nose follows the aim.
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  p.fireTimer -= dt;
  p.invuln = Math.max(0, p.invuln - dt);
  if (input.firing && p.fireTimer <= 0) {
    p.fireTimer = p.fireInterval;
    const spread = 0.09;
    for (let i = 0; i < p.shots; i++) {
      const off = (i - (p.shots - 1) / 2) * spread;
      const a = p.angle + off;
      world.bullets.push({
        x: p.x + Math.cos(a) * (PLAYER.radius + 6),
        y: p.y + Math.sin(a) * (PLAYER.radius + 6),
        vx: Math.cos(a) * PLAYER.bulletSpeed + p.vx * 0.4,
        vy: Math.sin(a) * PLAYER.bulletSpeed + p.vy * 0.4,
        r: PLAYER.bulletRadius,
        life: 0.9,
      });
    }
    world.events.push({ type: 'shoot' });
  }
}

function stepEnemies(world, dt) {
  const p = world.player;
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    e.t += dt;
    if (e.type === 'drifter') {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.r || e.x > VIEW.width - e.r) e.vx *= -1;
      if (e.y < e.r || e.y > VIEW.height - e.r) e.vy *= -1;
      e.x = Math.max(e.r, Math.min(VIEW.width - e.r, e.x));
      e.y = Math.max(e.r, Math.min(VIEW.height - e.r, e.y));
    } else if (e.type === 'chaser') {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const wobble = Math.sin(e.t * 3 + e.seed) * 0.4;
      e.vx += (Math.cos(a + wobble) * e.baseSpeed - e.vx) * Math.min(1, 2.2 * dt);
      e.vy += (Math.sin(a + wobble) * e.baseSpeed - e.vy) * Math.min(1, 2.2 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else if (e.type === 'weaver') {
      e.x += e.vx * dt;
      e.y += e.vy * dt + Math.sin(e.t * 2.4 + e.seed) * 46 * dt;
      if (e.x < e.r || e.x > VIEW.width - e.r) e.vx *= -1;
      if (e.y < e.r || e.y > VIEW.height - e.r) e.vy *= -1;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.x > 0 && e.x < VIEW.width && e.y > 0 && e.y < VIEW.height) {
        e.fireTimer = Math.max(1.4, 2.4 - world.wave * 0.08);
        const a = Math.atan2(p.y - e.y, p.x - e.x) + range(world.rng, -0.12, 0.12);
        world.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          r: 5,
          life: 4,
        });
        world.events.push({ type: 'enemyShoot' });
      }
    } else if (e.type === 'mine') {
      e.x += Math.sin(e.t * 0.7 + e.seed) * 6 * dt;
      e.y += Math.cos(e.t * 0.9 + e.seed) * 6 * dt;
    }
    // Contact with the player hurts.
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < p.r + e.r - 2 && world.state === 'playing') {
      damagePlayer(world, 1);
      // The enemy is knocked away so one touch is not a double hit.
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.x += Math.cos(a) * 26;
      e.y += Math.sin(a) * 26;
    }
  }
}

function stepBullets(world, dt) {
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
      world.bullets.splice(i, 1);
      continue;
    }
    for (let j = world.enemies.length - 1; j >= 0; j--) {
      const e = world.enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        world.bullets.splice(i, 1);
        e.hp -= 1;
        world.events.push({ type: 'enemyHit' });
        burst(world, b.x, b.y, enemyColor(e.type), 5, 110);
        if (e.hp <= 0) killEnemy(world, e, j);
        break;
      }
    }
  }
  for (let i = world.enemyBullets.length - 1; i >= 0; i--) {
    const b = world.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const p = world.player;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
      world.enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + PLAYER.radius - 2) {
      world.enemyBullets.splice(i, 1);
      damagePlayer(world, 1);
    }
  }
}

function stepSalvage(world, dt) {
  const p = world.player;
  for (let i = world.salvage.length - 1; i >= 0; i--) {
    const s = world.salvage[i];
    s.t += dt;
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d < p.magnetRadius) {
      const a = Math.atan2(p.y - s.y, p.x - s.x);
      const pull = 420 * (1 - d / p.magnetRadius) + 120;
      s.vx += Math.cos(a) * pull * dt * 4;
      s.vy += Math.sin(a) * pull * dt * 4;
    }
    s.vx *= Math.exp(-1.6 * dt);
    s.vy *= Math.exp(-1.6 * dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d < PLAYER.pickupRadius + 8) {
      world.salvage.splice(i, 1);
      world.salvageCollected += 1;
      if (world.comboTimer > 0) {
        world.combo = Math.min(world.combo + SCORING.comboStep, SCORING.comboMax);
      } else {
        world.combo = 1;
      }
      world.comboTimer = SCORING.comboWindow;
      const value = Math.round(SCORING.salvageValue * world.combo);
      world.score += value;
      addFloat(world, s.x, s.y - 8, `+${value}`, '#ffc53d');
      burst(world, s.x, s.y, '#ffc53d', 6, 90);
      world.events.push({ type: 'pickup', combo: world.combo });
    }
  }
}

function stepParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2 * dt);
    pt.vy *= Math.exp(-2 * dt);
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floats.length - 1; i >= 0; i--) {
    const f = world.floats[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) world.floats.splice(i, 1);
  }
}

export function updateWorld(world, input, dt) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - FX.shakeDecay * dt);
  world.flash = Math.max(0, world.flash - dt * 1.4);
  world.comboTimer = Math.max(0, world.comboTimer - dt);
  if (world.comboTimer === 0) world.combo = 1;
  stepParticles(world, dt);

  if (world.state !== 'playing') return;

  // Spawning.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = WAVES.spawnInterval;
      spawnEnemy(world, world.spawnQueue.shift());
    }
  } else if (world.enemies.length === 0) {
    // Wave cleared: bonus, then a choice of upgrades.
    world.score += WAVES.clearBonus;
    addFloat(world, VIEW.width / 2, VIEW.height / 2 - 60, `WAVE BONUS +${WAVES.clearBonus}`, '#5ef2e2');
    offerUpgrades(world);
    return;
  }

  stepPlayer(world, input, dt);
  if (world.state !== 'playing') return;
  stepEnemies(world, dt);
  stepBullets(world, dt);
  stepSalvage(world, dt);
}
