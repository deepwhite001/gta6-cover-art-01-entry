// Neon Coast editor: controls, photo slots, live preview, PNG export.
// A `?view=` query instead stages one fixed scene (sample photos, words,
// look) and sets window.__shotReady once the cover is painted, for
// screenshots. Photos never leave the machine: uploads are read with
// FileReader and drawn straight onto the canvas.

import { drawCover, TONES, SIZES, LAYOUTS } from './studio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusLine = $('status');

const state = {
  layout: 'poster',
  tone: 'sunset',
  size: 'square',
  title: 'Neon Heat',
  tagline: 'Sunset Run',
  photos: [
    { image: null, zoom: 1, dx: 0, dy: 0 },
    { image: null, zoom: 1, dx: 0, dy: 0 },
  ],
};

function paint() {
  const { w, h } = drawCover(canvas, state);
  $('size-note').textContent = `Canvas ${w} x ${h} — the preview is the PNG you get.`;
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('not a photo'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`sample ${name} missing`));
    img.src = `samples/${name}.jpg`;
  });
}

async function putFile(input, slot) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    state.photos[slot].image = await readFileAsImage(file);
    statusLine.textContent = `${file.name} is in slot ${slot + 1}.`;
    paint();
  } catch {
    statusLine.textContent = 'That file did not open as a photo — try another one.';
  }
}

async function putSample(name, slot) {
  try {
    state.photos[slot].image = await loadSample(name);
    statusLine.textContent = `Sample “${name}” is in slot ${slot + 1}.`;
    paint();
  } catch {
    statusLine.textContent = 'The sample photo did not load.';
  }
}

function wireRadios(name, key) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state[key] = input.value;
        paint();
      }
    });
  });
}

function wireSlider(id, slot, key, format) {
  const input = $(id);
  input.addEventListener('input', () => {
    state.photos[slot][key] = Number(input.value);
    $(`${id}-value`).textContent = format(input.value);
    paint();
  });
}

$('slot-a-file').addEventListener('change', (e) => putFile(e.target, 0));
$('slot-b-file').addEventListener('change', (e) => putFile(e.target, 1));
$('slot-a-pier').addEventListener('click', () => putSample('pier', 0));
$('slot-a-boulevard').addEventListener('click', () => putSample('boulevard', 0));
$('slot-b-pier').addEventListener('click', () => putSample('pier', 1));
$('slot-b-boulevard').addEventListener('click', () => putSample('boulevard', 1));

$('title').addEventListener('input', (e) => { state.title = e.target.value; paint(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; paint(); });

wireRadios('layout', 'layout');
wireRadios('tone', 'tone');
$('size').addEventListener('change', (e) => { state.size = e.target.value; paint(); });

wireSlider('zoom-a', 0, 'zoom', (v) => `Zoom ${Number(v).toFixed(2)}x`);
wireSlider('panx-a', 0, 'dx', (v) => `Pan ${Number(v).toFixed(2)}`);
wireSlider('pany-a', 0, 'dy', (v) => `Lift ${Number(v).toFixed(2)}`);
wireSlider('zoom-b', 1, 'zoom', (v) => `Zoom ${Number(v).toFixed(2)}x`);
wireSlider('panx-b', 1, 'dx', (v) => `Pan ${Number(v).toFixed(2)}`);
wireSlider('pany-b', 1, 'dy', (v) => `Lift ${Number(v).toFixed(2)}`);

$('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      statusLine.textContent = 'The export did not work — try again.';
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-${canvas.width}x${canvas.height}.png`;
    link.click();
    statusLine.textContent = `Saved neon-coast-${canvas.width}x${canvas.height}.png`;
  }, 'image/png');
});

$('clear').addEventListener('click', () => {
  state.photos[0].image = null;
  state.photos[1].image = null;
  statusLine.textContent = 'Photos cleared — load a sample or your own photo.';
  paint();
});

function setControl(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function checkRadio(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = input.value === value;
  });
}

// Fixed scene for screenshots: sample photos, words and look from the URL.
async function stageScene(query) {
  if (query.get('view') === 'cover') document.body.classList.add('cover-only');
  const title = query.get('title');
  const tag = query.get('tag');
  if (title !== null) state.title = title;
  if (tag !== null) state.tagline = tag;
  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const tone = query.get('tone');
  if (tone && TONES[tone]) state.tone = tone;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const slotA = query.get('slotA') || 'pier';
  const slotB = query.get('slotB');
  try {
    state.photos[0].image = await loadSample(slotA);
    if (slotB) state.photos[1].image = await loadSample(slotB);
  } catch {
    // A missing sample still leaves a cover: empty panels draw a placeholder.
  }
  setControl('title', state.title);
  setControl('tagline', state.tagline);
  checkRadio('layout', state.layout);
  checkRadio('tone', state.tone);
  setControl('size', state.size);
  paint();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

const params = new URLSearchParams(location.search);
if (params.get('view')) {
  stageScene(params);
} else {
  paint();
}
