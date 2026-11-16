// Starfall Salvage — the hand-in program (Node 22, standard library
// only). It copies this repository's game/ and screenshots/ into the
// grader's output directory and writes /output/dossier.json with the
// kit's vendored library, so the judge reads exactly what was built.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the kit's RULES.txt: they refuse an
// entry the scorer would refuse, so a bad hand-in fails here first.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outDir, dossierCaps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote dossier.json (${dossier.length} bytes) to ${outDir}`);
