// Neon Coast, a gta6-cover-art-01 entry (Node 22, standard library only).
// The app lives in this directory's app/ folder: plain static files a
// desktop browser loads offline (app/index.html and its ES modules, no
// library, no network request at run time). This file hands the entry in: it
// copies app/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library. The app itself is a cover maker: two
// photos cut into panels under a hand-painted sunset sky, with a big title,
// exported as a PNG in the common post sizes. Its two sample photos
// (app/samples/) were made for make.fun with an image model and are free
// to use.
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse early, with a plain message, when the entry breaks the scorer's
// caps the dossier step cannot fix: app/index.html missing, or the wrong
// number of screenshots, or one over 256 KiB.
function preflight() {
  if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing');
  }
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) throw new Error(`${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

function handIn(dirName) {
  const from = join(repoRoot, dirName);
  const to = join(outDir, dirName);
  if (!existsSync(from)) return false;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  return true;
}

mkdirSync(outDir, { recursive: true });
preflight();
handIn('app');
handIn('screenshots');

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ over 1000 bytes — app/ shares /output's own
// 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
