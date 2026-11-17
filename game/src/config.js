// Starfall Salvage — tuning constants and palette.
// One place for every number the game balances on, so tuning never
// means hunting through the simulation or the renderer.

export const VIEW = {
  width: 960,
  height: 540,
};

export const PALETTE = {
  backgroundTop: '#0a0e24',
  backgroundBottom: '#141035',
  nebulaA: '#2a1b5e',
  nebulaB: '#0f2a4a',
  star: '#cfe6ff',
  ship: '#5ef2e2',
  shipCore: '#eafffb',
  bullet: '#ffe066',
  bulletCore: '#fffbe8',
  salvage: '#ffc53d',
  salvageCore: '#fff3c4',
  drifter: '#ff5da2',
  chaser: '#ff9f43',
  weaver: '#b388ff',
  splitter: '#7dff8a',
  mine: '#ff5252',
  enemyBullet: '#ff7ad9',
  particle: '#ffffff',
  hudText: '#e8f1ff',
  hudDim: '#8fa3c8',
  accent: '#5ef2e2',
  danger: '#ff5252',
  panel: 'rgba(10, 14, 36, 0.82)',
  panelEdge: '#3d5a80',
  card: 'rgba(24, 32, 68, 0.92)',
  cardEdge: '#5ef2e2',
  gold: '#ffc53d',
};

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 320,
  damping: 3.2,
  fireInterval: 0.16,
  bulletSpeed: 620,
  bulletRadius: 5,
  maxHull: 3,
  invulnerableTime: 1.6,
  magnetRadius: 110,
  pickupRadius: 22,
};

export const ENEMIES = {
  drifter: { radius: 16, hp: 1, speed: 90, score: 50, salvage: 1 },
  chaser: { radius: 14, hp: 2, speed: 130, score: 100, salvage: 2 },
  weaver: { radius: 15, hp: 2, speed: 80, score: 150, salvage: 2 },
  splitter: { radius: 17, hp: 2, speed: 70, score: 150, salvage: 2 },
  mine: { radius: 13, hp: 1, speed: 0, score: 75, salvage: 1 },
};

export const WAVES = {
  // How many of each enemy a wave fields. The wave table is data, not
  // code, so the difficulty curve is easy to read and retune.
  table: [
    { drifter: 5, chaser: 0, weaver: 0, splitter: 0, mine: 0 },
    { drifter: 7, chaser: 2, weaver: 0, splitter: 0, mine: 0 },
    { drifter: 6, chaser: 4, weaver: 2, splitter: 1, mine: 0 },
    { drifter: 8, chaser: 5, weaver: 3, splitter: 2, mine: 2 },
    { drifter: 9, chaser: 6, weaver: 4, splitter: 3, mine: 4 },
    { drifter: 10, chaser: 8, weaver: 5, splitter: 3, mine: 5 },
    { drifter: 12, chaser: 9, weaver: 6, splitter: 4, mine: 6 },
  ],
  spawnInterval: 0.75,
  betweenWaveDelay: 2.2,
  clearBonus: 250,
};

export const UPGRADES = [
  {
    id: 'twin',
    name: 'Twin Blaster',
    blurb: 'Fire two bolts at once.',
    apply: (p) => { p.shots = 2; },
  },
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    blurb: 'Fire 35% faster.',
    apply: (p) => { p.fireInterval *= 0.65; },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    blurb: 'Bolts punch through one extra drone.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'hull',
    name: 'Reinforced Hull',
    blurb: '+1 max hull, fully repaired.',
    apply: (p) => { p.maxHull += 1; p.hull = p.maxHull; },
  },
  {
    id: 'magnet',
    name: 'Magnet Array',
    blurb: 'Salvage flies to you from farther away.',
    apply: (p) => { p.magnetRadius *= 1.8; },
  },
  {
    id: 'shield',
    name: 'Aegis Shield',
    blurb: 'Block one hit each wave.',
    apply: (p) => { p.shield = true; },
  },
];

export const SCORING = {
  salvageValue: 25,
  comboWindow: 3.0,
  comboStep: 0.25,
  comboMax: 3.0,
};

export const FX = {
  shakeOnHit: 14,
  shakeOnDeath: 22,
  shakeDecay: 26,
  particlesPerExplosion: 26,
  floatTextLife: 1.1,
};
