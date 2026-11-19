// Neon Coast — cover drawing engine.
// Everything is drawn by hand on canvas: a Vice City dusk sky, a sun that
// stays clear of the rooftops, a lit skyline, palm silhouettes, the user's
// photos in panels, and bold caption lettering. No images are fetched: the
// only pictures are the photos the user loads from their own machine.

export const TONES = {
  sunset: {
    sky: ['#2b0a4e', '#c62b6b', '#ff6a3d', '#ffb347'],
    sun: '#ffd76a',
    glow: 'rgba(255, 183, 71, 0.55)',
    towers: '#1c0b31',
    windows: ['#ffd76a', '#ff9e57', '#7df9ff'],
    band: '#160a26',
    ink: '#fff7ea',
    accent: '#ff2e88',
    frame: '#ffd76a',
  },
  neon: {
    sky: ['#04001a', '#2a0a5e', '#7a1e8f', '#ff2e88'],
    sun: '#ff5e8a',
    glow: 'rgba(255, 46, 136, 0.5)',
    towers: '#0a0620',
    windows: ['#00e5ff', '#ff5e8a', '#ffe14d'],
    band: '#0a0618',
    ink: '#f2f6ff',
    accent: '#00e5ff',
    frame: '#00e5ff',
  },
  dawn: {
    sky: ['#062a33', '#0e6f7d', '#37b6a2', '#a8e6cf'],
    sun: '#fff3b0',
    glow: 'rgba(255, 243, 176, 0.5)',
    towers: '#06222b',
    windows: ['#fff3b0', '#ffd166', '#9ff5e0'],
    band: '#06222b',
    ink: '#f4fff9',
    accent: '#ffd166',
    frame: '#fff3b0',
  },
};

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const LAYOUTS = {
  poster: 'Poster — one big panel',
  grid: 'Four panels — two by two',
  strip: 'Three strips — stacked bands',
};

// A tiny deterministic random source so a cover renders the same every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skylineSpans(rand, width, baseY, topY) {
  const spans = [];
  let x = -width * 0.02;
  while (x < width * 1.02) {
    const w = width * (0.05 + rand() * 0.075);
    const top = topY + rand() * (baseY - topY) * 0.75;
    spans.push({ x, w, top });
    x += w + width * (0.004 + rand() * 0.012);
  }
  return spans;
}

function drawSky(ctx, w, h, tone) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  tone.sky.forEach((color, i) => grad.addColorStop(i / (tone.sky.length - 1), color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx, w, h, tone) {
  // The sun sits high on purpose: its disc ends well above the tallest
  // rooftop, so it is never clipped by the skyline in any size, and the
  // poster panel starts low enough that most of the disc stays visible.
  const cx = w * 0.5;
  const cy = h * 0.15;
  const r = Math.min(w, h) * 0.095;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 3.1);
  halo.addColorStop(0, tone.glow);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 3.1, cy - r * 3.1, r * 6.2, r * 6.2);
  ctx.fillStyle = tone.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Thin horizon slats across the disc, in the sky's deep colour.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = tone.towers;
  const gap = r * 0.34;
  for (let y = cy + r * 0.08; y < cy + r; y += gap) {
    ctx.fillRect(cx - r, y, r * 2, Math.max(2, r * 0.07));
  }
  ctx.restore();
}

function drawSkyline(ctx, w, h, tone, rand) {
  const baseY = h;
  const topY = h * 0.44;
  const spans = skylineSpans(rand, w, baseY, topY);
  ctx.fillStyle = tone.towers;
  for (const s of spans) {
    ctx.fillRect(s.x, s.top, s.w, baseY - s.top);
    if (rand() > 0.55) {
      const aw = s.w * (0.24 + rand() * 0.2);
      ctx.fillRect(s.x + s.w * 0.5 - aw / 2, s.top - h * 0.03, aw, h * 0.03);
    }
  }
  // Lit windows: a sparse scatter inside the towers.
  for (const s of spans) {
    const rows = Math.floor((baseY - s.top) / (h * 0.045));
    const cols = Math.max(1, Math.floor(s.w / (w * 0.028)));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (rand() > 0.62) {
          ctx.fillStyle = tone.windows[Math.floor(rand() * tone.windows.length)];
          ctx.globalAlpha = 0.55 + rand() * 0.45;
          ctx.fillRect(
            s.x + w * 0.008 + c * w * 0.028,
            s.top + h * 0.018 + r * h * 0.045,
            Math.max(2, w * 0.011),
            Math.max(2, h * 0.02),
          );
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPalm(ctx, x, baseY, height, lean, tone) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.strokeStyle = tone.towers;
  ctx.fillStyle = tone.towers;
  ctx.lineWidth = Math.max(3, height * 0.035);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(height * 0.06, -height * 0.55, height * 0.02, -height);
  ctx.stroke();
  const topX = height * 0.02;
  const topY = -height;
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI * (0.08 + (i / 6) * 0.84);
    const len = height * (0.34 + (i % 2) * 0.07);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.55,
      topY + Math.sin(angle) * len * 0.4 - height * 0.05,
      topX + Math.cos(angle) * len,
      topY + Math.sin(angle) * len + height * 0.16,
    );
    ctx.lineWidth = Math.max(2, height * 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalms(ctx, w, h, tone, rand) {
  const baseY = h * 1.0;
  drawPalm(ctx, w * 0.03, baseY, h * 0.3, 0.1, tone);
  drawPalm(ctx, w * 0.97, baseY, h * 0.26, -0.12, tone);
  if (rand() > 0.4) drawPalm(ctx, w * 0.12, baseY, h * 0.2, 0.06, tone);
}

function panelRects(layout, w, h) {
  const m = w * 0.06;
  const bandTop = h * 0.8;
  const gap = w * 0.02;
  if (layout === 'grid') {
    const pw = (w - m * 2 - gap) / 2;
    const ph = (bandTop - h * 0.07 - gap) / 2;
    return [
      { x: m, y: h * 0.07, w: pw, h: ph },
      { x: m + pw + gap, y: h * 0.07, w: pw, h: ph },
      { x: m, y: h * 0.07 + ph + gap, w: pw, h: ph },
      { x: m + pw + gap, y: h * 0.07 + ph + gap, w: pw, h: ph },
    ];
  }
  if (layout === 'strip') {
    const ph = (bandTop - h * 0.07 - gap * 2) / 3;
    return [0, 1, 2].map((i) => ({
      x: m,
      y: h * 0.07 + i * (ph + gap),
      w: w - m * 2,
      h: ph,
    }));
  }
  // The poster panel starts low so the sun above it stays mostly visible.
  return [{ x: m, y: h * 0.22, w: w - m * 2, h: bandTop - h * 0.22 - gap }];
}

function drawPhoto(ctx, rect, photo, tone) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!photo || !photo.image) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, tone.band);
    grad.addColorStop(1, tone.towers);
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = tone.ink;
    ctx.globalAlpha = 0.75;
    ctx.font = `600 ${Math.round(rect.h * 0.07)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drop your photo here', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.globalAlpha = 1;
  } else {
    const img = photo.image;
    const zoom = photo.zoom || 1;
    const base = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
    const dw = img.width * base;
    const dh = img.height * base;
    const dx = rect.x + (rect.w - dw) / 2 + (photo.dx || 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (photo.dy || 0) * rect.h;
    ctx.drawImage(img, dx, dy, dw, dh);
    // Warm grade wash so photos sit in the same dusk as the sky.
    ctx.fillStyle = tone.accent;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = tone.frame;
  ctx.lineWidth = Math.max(2, rect.w * 0.006);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawCaption(ctx, w, h, tone, title, tagline) {
  const bandTop = h * 0.8;
  ctx.fillStyle = tone.band;
  ctx.fillRect(0, bandTop, w, h - bandTop);
  ctx.fillStyle = tone.accent;
  ctx.fillRect(0, bandTop, w, Math.max(3, h * 0.004));
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const eyebrow = 'L E O N I D A';
  ctx.fillStyle = tone.accent;
  ctx.font = `700 ${Math.round(h * 0.018)}px Arial, sans-serif`;
  ctx.fillText(eyebrow, cx, bandTop + h * 0.032);
  const titleSize = Math.min(w * 0.085, h * 0.075);
  ctx.font = `900 ${Math.round(titleSize)}px "Arial Black", Arial, sans-serif`;
  const label = (title || 'NEON COAST').toUpperCase();
  const ty = bandTop + h * 0.098;
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeStyle = tone.towers;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, cx, ty);
  ctx.fillStyle = tone.ink;
  ctx.fillText(label, cx, ty);
  if (tagline) {
    ctx.fillStyle = tone.ink;
    ctx.globalAlpha = 0.85;
    ctx.font = `600 ${Math.round(h * 0.024)}px Arial, sans-serif`;
    ctx.fillText(tagline, cx, bandTop + h * 0.163);
    ctx.globalAlpha = 1;
  }
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// Render one cover. `state` holds layout, tone, title, tagline and photos:
// photos[0] is the hero shot, photos[1] the second slot; layouts reuse them
// in order (grid and strip alternate the two).
export function drawCover(canvas, state) {
  const size = SIZES[state.size] || SIZES.square;
  const tone = TONES[state.tone] || TONES.sunset;
  const w = size.w;
  const h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(20261119);
  drawSky(ctx, w, h, tone);
  drawSun(ctx, w, h, tone);
  drawSkyline(ctx, w, h, tone, rand);
  drawPalms(ctx, w, h, tone, rand);
  const rects = panelRects(state.layout || 'poster', w, h);
  const photos = state.photos || [];
  const picks = state.layout === 'poster'
    ? [photos[0]]
    : state.layout === 'grid'
      ? [photos[0], photos[1], photos[1], photos[0]]
      : [photos[0], photos[1], photos[0]];
  rects.forEach((rect, i) => drawPhoto(ctx, rect, picks[i], tone));
  drawCaption(ctx, w, h, tone, state.title, state.tagline);
  drawVignette(ctx, w, h);
  return { w, h };
}
