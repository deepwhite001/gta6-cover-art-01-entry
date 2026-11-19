// Neon Coast, a gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, no library, no
// network request at run time), and this file hands it in. It copies app/
// and screenshots/ from beside this file into the output directory and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library. The app itself is a cover maker: a photo (or two) cut
// into panels under a painted sunset sky, with a big title, exported as a
// PNG in the common post sizes. Its two sample photos (app/samples/) were
// made for make.fun with an image model and are free to use.
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

/** Copies one directory tree into the output, creating it when missing. */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
copyTree(join(entryDir, 'app'), join(outputDir, 'app'));
if (existsSync(join(entryDir, 'screenshots'))) {
  copyTree(join(entryDir, 'screenshots'), join(outputDir, 'screenshots'));
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
