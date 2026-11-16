// Starfall Salvage — browser wiring: loop, states, input, sound.
// The simulation (world.js) and the drawing (render.js) stay pure;
// this file is the only one that knows about the DOM, the clock and
// the audio device.

import { VIEW } from './config.js';
import { createWorld, startRun, updateWorld, applyUpgrade, endRun } from './world.js';
import { drawScene } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

const BEST_KEY = 'starfall-salvage-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private mode or no storage: the run still counts.
  }
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const shotSeed = Number(params.get('seed') || '1');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = new Input(canvas);
input.attach();
const sounds = new SoundBank();
input.onFirstGesture = () => sounds.unlock();

const world = createWorld(shot ? shotSeed : (Date.now() % 2147483647));
world.best = loadBest();

function fitCanvas() {
  const scale = Math.min(
    window.innerWidth / VIEW.width,
    window.innerHeight / VIEW.height,
  );
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// --- Autopilot: flies the ship for posed screenshots. -------------
// It chases salvage, keeps its distance from drones, and shoots the
// nearest one. Only used when ?shot= is in the URL. In 'kamikaze'
// mode it flies straight at the nearest drone instead: the end shot
// uses that so the run genuinely ends on screen.
function botInput(mode = 'survive') {
  const p = world.player;
  let tx = VIEW.width / 2;
  let ty = VIEW.height / 2;
  let aimX = p.x;
  let aimY = p.y - 100;
  let firing = false;
  let nearestEnemy = null;
  let nearestD = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) {
      nearestD = d;
      nearestEnemy = e;
    }
  }
  let nearestSalvage = null;
  let nearestS = Infinity;
  for (const s of world.salvage) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < nearestS) {
      nearestS = d;
      nearestSalvage = s;
    }
  }
  if (mode === 'kamikaze' && nearestEnemy) {
    tx = nearestEnemy.x;
    ty = nearestEnemy.y;
  } else if (nearestSalvage && nearestS < 420) {
    tx = nearestSalvage.x;
    ty = nearestSalvage.y;
  } else if (nearestEnemy) {
    tx = nearestEnemy.x;
    ty = nearestEnemy.y;
  }
  // Flee anything that gets too close (not in kamikaze mode).
  let fx = 0;
  let fy = 0;
  if (mode !== 'kamikaze') {
    for (const e of world.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 130) {
        const w = (130 - d) / 130;
        fx += ((p.x - e.x) / (d || 1)) * w * 2.2;
        fy += ((p.y - e.y) / (d || 1)) * w * 2.2;
      }
    }
  }
  let mx = tx - p.x + fx * 60;
  let my = ty - p.y + fy * 60;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  if (nearestEnemy && nearestD < 520) {
    aimX = nearestEnemy.x;
    aimY = nearestEnemy.y;
    firing = true;
  }
  return { move: { x: mx, y: my }, aimX, aimY, firing };
}

function poseShot() {
  // Runs the simulation forward as fast as possible, then freezes the
  // frame so the screenshot is stable and repeatable.
  const dt = 1 / 60;
  if (shot === 'start') {
    // A few drifters posed behind the title panel for life.
    world.enemies = [
      { type: 'drifter', x: 150, y: 120, vx: 0, vy: 0, hp: 1, maxHp: 1, r: 16, t: 0.7, fireTimer: 2, baseSpeed: 90, seed: 1 },
      { type: 'chaser', x: 810, y: 110, vx: 0, vy: 0, hp: 2, maxHp: 2, r: 14, t: 1.9, fireTimer: 2, baseSpeed: 130, seed: 2 },
      { type: 'weaver', x: 820, y: 440, vx: 0, vy: 0, hp: 2, maxHp: 2, r: 15, t: 0.4, fireTimer: 2, baseSpeed: 80, seed: 3 },
      { type: 'drifter', x: 130, y: 450, vx: 0, vy: 0, hp: 1, maxHp: 1, r: 16, t: 2.6, fireTimer: 2, baseSpeed: 90, seed: 4 },
    ];
    world.salvage = [
      { x: 700, y: 130, vx: 0, vy: 0, t: 0.5 },
      { x: 250, y: 430, vx: 0, vy: 0, t: 2.1 },
    ];
    world.time = 3;
    return;
  }
  startRun(world);
  let steps = 0;
  const maxSteps = 60 * 60;
  while (steps < maxSteps) {
    steps++;
    const mode = shot === 'end' && steps > 60 * 15 ? 'kamikaze' : 'survive';
    updateWorld(world, botInput(mode), dt);
    if (shot === 'play') {
      if (world.state === 'upgrade') {
        applyUpgrade(world, 0); // twin blaster: more bolts in the shot
        continue;
      }
      if (world.state === 'gameover') break;
      // Freeze on a busy frame: several drones on screen and bolts flying.
      const onScreen = world.enemies.filter(
        (e) => e.x > 0 && e.x < VIEW.width && e.y > 0 && e.y < VIEW.height,
      ).length;
      if (world.wave >= 2 && onScreen >= 3 && world.bullets.length >= 2 && steps > 60 * 6) break;
      if (world.wave >= 2 && world.enemies.length >= 4 && steps > 60 * 25) break;
    } else if (shot === 'upgrade') {
      if (world.state === 'upgrade') break;
      if (world.state === 'gameover') break;
    } else if (shot === 'end') {
      if (world.state === 'gameover') break;
      if (world.state === 'upgrade') {
        applyUpgrade(world, 0); // keep the run going toward its end
        continue;
      }
      // Once the run has a real score behind it, end it through the
      // world's own fatal-blow path and freeze on the game-over screen.
      if (world.wave >= 2 && steps > 60 * 8) {
        endRun(world);
        break;
      }
    }
  }
  world.events.length = 0;
}

if (shot) {
  try {
    poseShot();
  } catch (err) {
    window.__shotError = String(err && err.message ? err.message : err);
  }
  // Diagnostic summary in the page title (never rendered on screen):
  // lets a headless run report exactly what the frozen frame holds.
  document.title = JSON.stringify({
    shot,
    state: world.state,
    wave: world.wave,
    score: world.score,
    bullets: world.bullets.length,
    enemies: world.enemies.length,
    salvage: world.salvage.length,
  });
  window.__shotReady = true;
}

// --- Live game ----------------------------------------------------
let paused = false;
let last = performance.now();

function drainEvents() {
  for (const ev of world.events) {
    if (ev.type === 'shoot') sounds.shoot();
    else if (ev.type === 'enemyHit') sounds.enemyHit();
    else if (ev.type === 'explosion') sounds.explosion(ev.big);
    else if (ev.type === 'pickup') sounds.pickup(ev.combo);
    else if (ev.type === 'hurt') sounds.hurt();
    else if (ev.type === 'waveClear') sounds.waveClear();
    else if (ev.type === 'upgrade') sounds.upgrade();
    else if (ev.type === 'gameOver') sounds.gameOver();
    else if (ev.type === 'enemyShoot') sounds.tone({ type: 'sine', from: 300, to: 240, dur: 0.06, vol: 0.08 });
    else if (ev.type === 'shield') sounds.tone({ type: 'sine', from: 700, to: 1100, dur: 0.18, vol: 0.3 });
  }
  world.events.length = 0;
}

function upgradeCardAt(mx, my) {
  const cardW = 220;
  const cardH = 190;
  const gap = 26;
  const y0 = 158;
  const total = cardW * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  if (my < y0 || my > y0 + cardH) return -1;
  for (let i = 0; i < 3; i++) {
    const x = x0 + i * (cardW + gap);
    if (mx >= x && mx <= x + cardW) return i;
  }
  return -1;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  if (shot) {
    // Posed frame: render the frozen world every frame, no stepping.
    drawScene(ctx, world);
    return;
  }

  if (input.wasPressed('m')) sounds.toggleMute();
  if (input.wasPressed('p') && (world.state === 'playing' || world.state === 'paused')) {
    paused = !paused;
    world.state = paused ? 'paused' : 'playing';
    sounds.click();
  }

  if (world.state === 'title' && (input.wasPressed('enter') || input.mouseDown)) {
    sounds.unlock();
    sounds.click();
    startRun(world);
  } else if (world.state === 'gameover' && input.wasPressed('enter')) {
    sounds.click();
    startRun(world);
  } else if (world.state === 'upgrade') {
    let pick = -1;
    if (input.wasPressed('1')) pick = 0;
    else if (input.wasPressed('2')) pick = 1;
    else if (input.wasPressed('3')) pick = 2;
    else if (input.mouseDown) pick = upgradeCardAt(input.mouseX, input.mouseY);
    if (pick >= 0) applyUpgrade(world, pick);
  }

  if (!paused && world.state === 'playing') {
    const snapshot = {
      move: input.moveVector(),
      aimX: input.mouseX,
      aimY: input.mouseY,
      firing: input.mouseDown || input.down(' '),
    };
    updateWorld(world, snapshot, dt);
    drainEvents();
    if (world.state === 'gameover' && world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
  } else {
    drainEvents();
  }

  drawScene(ctx, world);
  input.endFrame();
}

requestAnimationFrame(frame);
