// Neon Coast editor wiring: reads the controls, keeps the two photos, redraws
// the cover on every change, and downloads the finished PNG. A `?shot=`
// query instead sets up one fixed scene (sample photo, words, look) and marks
// window.__shotReady once the cover is painted, for screenshots.

import { drawCoverArt, LAYOUTS, PALETTES, SIZES } from './studio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const art = {
  photoA: null,
  photoB: null,
  title: 'Neon Heat',
  tagline: 'Sunset Run',
  layout: 'poster',
  palette: 'sunset',
  size: 'square',
  zoomA: 1,
  panA: 0,
  zoomB: 1,
  panB: 0,
};

function redraw() {
  drawCoverArt(canvas, art);
  $('size-note').textContent = `Canvas ${canvas.width} x ${canvas.height} — what you see is the PNG you get.`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function takeFile(input, slot) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    art[slot] = await loadImage(URL.createObjectURL(file));
    status.textContent = `${file.name} loaded.`;
    redraw();
  } catch {
    status.textContent = 'That file did not open as a photo — try another one.';
  }
}

async function takeSample(name, slot) {
  try {
    art[slot] = await loadImage(`samples/${name}.jpg`);
    status.textContent = `Sample ${name} loaded into ${slot === 'photoA' ? 'photo A' : 'photo B'}.`;
    redraw();
  } catch {
    status.textContent = 'The sample photo did not load.';
  }
}

function bindRadios(name, apply) {
  for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
    input.addEventListener('change', () => {
      if (input.checked) {
        apply(input.value);
        redraw();
      }
    });
  }
}

$('photo-a').addEventListener('change', (e) => takeFile(e.target, 'photoA'));
$('photo-b').addEventListener('change', (e) => takeFile(e.target, 'photoB'));
$('sample-a-pier').addEventListener('click', () => takeSample('pier', 'photoA'));
$('sample-a-boulevard').addEventListener('click', () => takeSample('boulevard', 'photoA'));
$('sample-b-pier').addEventListener('click', () => takeSample('pier', 'photoB'));
$('sample-b-boulevard').addEventListener('click', () => takeSample('boulevard', 'photoB'));

$('title').addEventListener('input', (e) => { art.title = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { art.tagline = e.target.value; redraw(); });

bindRadios('layout', (v) => { art.layout = v; });
bindRadios('palette', (v) => { art.palette = v; });
$('size').addEventListener('change', (e) => { art.size = e.target.value; redraw(); });

const sliders = [
  ['zoom-a', 'zoomA', (v) => `Zoom ${Number(v).toFixed(2)}x`],
  ['pan-a', 'panA', (v) => `Pan ${Number(v).toFixed(2)}`],
  ['zoom-b', 'zoomB', (v) => `Zoom ${Number(v).toFixed(2)}x`],
  ['pan-b', 'panB', (v) => `Pan ${Number(v).toFixed(2)}`],
];
for (const [id, key, label] of sliders) {
  const input = $(id);
  input.addEventListener('input', () => {
    art[key] = Number(input.value);
    $(`${id}-value`).textContent = label(input.value);
    redraw();
  });
}

$('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'The export did not work — try again.';
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-cover-${canvas.width}x${canvas.height}.png`;
    link.click();
    status.textContent = `Saved neon-coast-cover-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
});

/** Fixed scene for screenshots: loads the named samples and words, then paints. */
async function runShot(query) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  art.title = query.get('caption') ?? art.title;
  art.tagline = query.get('tagline') ?? art.tagline;
  if (LAYOUTS.includes(query.get('layout'))) art.layout = query.get('layout');
  if (Object.keys(PALETTES).includes(query.get('palette'))) art.palette = query.get('palette');
  if (Object.keys(SIZES).includes(query.get('size'))) art.size = query.get('size');
  const photo = query.get('photo') ?? 'pier';
  const photo2 = query.get('photo2');
  try {
    art.photoA = await loadImage(`samples/${photo}.jpg`);
    if (photo2) art.photoB = await loadImage(`samples/${photo2}.jpg`);
  } catch {
    // A missing sample still leaves a cover: the placeholder panels draw.
  }
  if (shot === 'editor') {
    $('title').value = art.title;
    $('tagline').value = art.tagline;
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query);
} else {
  redraw();
}
