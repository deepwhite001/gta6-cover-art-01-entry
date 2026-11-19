// Neon Coast drawing engine: turns photos, words and a layout choice into a
// multi-panel poster on a 2D canvas. Everything here is drawn by hand with
// canvas paths and gradients — no images are fetched, no fonts are loaded,
// so the result renders the same offline. Colours come from one of three
// palettes; panel geometry comes from one of three layouts.

export const PALETTES = {
  sunset: {
    skyTop: '#ff9e45', skyMid: '#ff5e7a', skyLow: '#7b2f8e',
    sun: '#ffd166', sunGlow: 'rgba(255, 190, 90, 0.55)',
    ink: '#1c0b2e', band: '#170a26',
    accent: '#ff2e88', accent2: '#22d3ee', frame: '#ff7ab8',
    title: '#ffffff', tag: '#ffd166',
  },
  neon: {
    skyTop: '#160a4d', skyMid: '#5b1a8a', skyLow: '#0d2b5e',
    sun: '#ff2e88', sunGlow: 'rgba(255, 46, 136, 0.5)',
    ink: '#0a0618', band: '#0b0620',
    accent: '#00e5ff', accent2: '#ff2e88', frame: '#37e6ff',
    title: '#ffffff', tag: '#00e5ff',
  },
  dawn: {
    skyTop: '#0e5a6e', skyMid: '#14919b', skyLow: '#f2a65a',
    sun: '#ffe08a', sunGlow: 'rgba(255, 220, 130, 0.5)',
    ink: '#0b2233', band: '#0d2436',
    accent: '#ff7a59', accent2: '#2ec4b6', frame: '#ffb08a',
    title: '#ffffff', tag: '#ffe08a',
  },
};

export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

export const LAYOUTS = ['poster', 'grid', 'strip'];

/** Small deterministic generator so a skyline looks the same every run. */
function seededStream(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Panel geometry for a layout at a given canvas size. Returns the sky band,
 * the photo panels (each names which photo it shows, its zoom and pan, and
 * its colour grade) and the title area. The title either sits over the hero
 * photo or in its own band, depending on the layout.
 */
export function layoutFor(kind, w, h) {
  const m = Math.round(w * 0.022);
  const g = Math.round(w * 0.011);
  const full = w - m * 2;
  if (kind === 'grid') {
    const skyH = Math.round(h * 0.17);
    const gridY = m + skyH + g;
    const gridH = Math.round(h * 0.62);
    const cellW = (full - g) / 2;
    const cellH = (gridH - g) / 2;
    const bandY = gridY + gridH + g;
    return {
      sky: rect(m, m, full, skyH),
      panels: [
        { ...rect(m, gridY, cellW, cellH), photo: 'A', zoom: 1, pan: 0, grade: 'none' },
        { ...rect(m + cellW + g, gridY, cellW, cellH), photo: 'B', zoom: 1.35, pan: -0.2, grade: 'cool' },
        { ...rect(m, gridY + cellH + g, cellW, cellH), photo: 'A', zoom: 1.7, pan: 0.35, grade: 'warm' },
        { ...rect(m + cellW + g, gridY + cellH + g, cellW, cellH), photo: 'A', zoom: 1.15, pan: -0.4, grade: 'duotone' },
      ],
      title: { ...rect(m, bandY, full, h - bandY - m), band: true, align: 'center' },
      kicker: { ...rect(m, m + Math.round(skyH * 0.12), full, Math.round(skyH * 0.2)), align: 'left' },
    };
  }
  if (kind === 'strip') {
    const skyH = Math.round(h * 0.2);
    const rowY = m + skyH + g;
    const rowH = Math.round(h * 0.55);
    const colW = (full - g * 2) / 3;
    const bandY = rowY + rowH + g;
    return {
      sky: rect(m, m, full, skyH),
      panels: [
        { ...rect(m, rowY, colW, rowH), photo: 'A', zoom: 1, pan: 0, grade: 'cool' },
        { ...rect(m + colW + g, rowY, colW, rowH), photo: 'B', zoom: 1.25, pan: 0.15, grade: 'none' },
        { ...rect(m + (colW + g) * 2, rowY, colW, rowH), photo: 'A', zoom: 1.9, pan: -0.3, grade: 'warm' },
      ],
      title: { ...rect(m, bandY, full, h - bandY - m), band: true, align: 'left' },
      kicker: { ...rect(m, m + Math.round(skyH * 0.12), full, Math.round(skyH * 0.2)), align: 'left' },
    };
  }
  // poster (default): sky, one hero photo, two small photos, title over the hero.
  const skyH = Math.round(h * 0.24);
  const heroY = m + skyH + g;
  const heroH = Math.round(h * 0.44);
  const rowY = heroY + heroH + g;
  const rowH = h - rowY - m;
  const halfW = (full - g) / 2;
  return {
    sky: rect(m, m, full, skyH),
    panels: [
      { ...rect(m, heroY, full, heroH), photo: 'A', zoom: 1, pan: 0, grade: 'none', hero: true },
      { ...rect(m, rowY, halfW, rowH), photo: 'A', zoom: 1.6, pan: 0.3, grade: 'warm' },
      { ...rect(m + halfW + g, rowY, halfW, rowH), photo: 'B', zoom: 1.2, pan: -0.25, grade: 'duotone' },
    ],
    title: {
      ...rect(m + Math.round(w * 0.03), heroY + heroH - Math.round(heroH * 0.3), full - Math.round(w * 0.06), Math.round(heroH * 0.3)),
      band: false, align: 'left',
    },
    kicker: { ...rect(m, m + Math.round(skyH * 0.1), full, Math.round(skyH * 0.2)), align: 'left' },
  };
}

function paintSky(ctx, r, pal) {
  const grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  grad.addColorStop(0, pal.skyTop);
  grad.addColorStop(0.55, pal.skyMid);
  grad.addColorStop(1, pal.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Low sun with a glow and retro slats across its lower half.
  const cx = r.x + r.w * 0.72;
  const cy = r.y + r.h * 0.62;
  const rad = r.h * 0.34;
  const glow = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 2.1);
  glow.addColorStop(0, pal.sunGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = pal.sun;
  ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  ctx.fillStyle = pal.skyLow;
  let band = cy + rad * 0.05;
  let thick = rad * 0.07;
  while (band < cy + rad) {
    ctx.fillRect(cx - rad, band, rad * 2, thick);
    band += thick * 2.4;
    thick *= 1.25;
  }
  ctx.restore();
}

function paintSkyline(ctx, r, pal, seed) {
  const rnd = seededStream(seed);
  const base = r.y + r.h;
  const ink = pal.ink;
  ctx.fillStyle = ink;
  let x = r.x;
  while (x < r.x + r.w) {
    const bw = r.w * (0.05 + rnd() * 0.07);
    const bh = r.h * (0.35 + rnd() * 0.55);
    ctx.fillRect(x, base - bh, bw, bh);
    if (rnd() > 0.6) { // a spire on some towers
      ctx.fillRect(x + bw * 0.45, base - bh - r.h * 0.16, bw * 0.1, r.h * 0.16);
    }
    // A few lit windows in the accent colour.
    ctx.fillStyle = pal.accent2;
    const lit = 1 + Math.floor(rnd() * 4);
    for (let i = 0; i < lit; i++) {
      const wx = x + bw * (0.15 + rnd() * 0.7);
      const wy = base - bh + r.h * (0.1 + rnd() * 0.6);
      ctx.fillRect(wx, wy, Math.max(2, r.w * 0.006), Math.max(2, r.h * 0.02));
    }
    ctx.fillStyle = ink;
    x += bw + r.w * 0.012;
  }
}

function paintPalm(ctx, x, y, s, lean, pal) {
  ctx.save();
  ctx.strokeStyle = pal.ink;
  ctx.fillStyle = pal.ink;
  ctx.lineCap = 'round';
  const topX = x + lean * s;
  const topY = y - s;
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.3, y - s * 0.55, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  for (let i = 0; i < 6; i++) {
    const spread = -Math.PI * 0.95 + (i / 5) * Math.PI * 0.9;
    const tipX = topX + Math.cos(spread) * s * 0.62;
    const tipY = topY + Math.sin(spread) * s * 0.42 + s * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(spread) * s * 0.4,
      topY + Math.sin(spread) * s * 0.28 - s * 0.16,
      tipX, tipY,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function paintPhoto(ctx, img, r, zoom, pan, pal) {
  if (!img) {
    // Placeholder panel: diagonal stripes and a plain instruction.
    ctx.fillStyle = pal.band;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = Math.max(6, r.w * 0.02);
    for (let d = -r.h; d < r.w + r.h; d += Math.max(24, r.w * 0.09)) {
      ctx.beginPath();
      ctx.moveTo(r.x + d, r.y + r.h);
      ctx.lineTo(r.x + d + r.h, r.y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(14, r.w * 0.045)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD YOUR PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    return;
  }
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = r.x + (r.w - dw) / 2 + pan * (dw - r.w) * 0.5;
  const dy = r.y + (r.h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function paintGrade(ctx, r, grade, pal) {
  if (grade === 'none') return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (grade === 'warm') {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(255, 140, 50, 0.10)');
    g.addColorStop(1, 'rgba(255, 40, 120, 0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  } else if (grade === 'cool') {
    ctx.fillStyle = 'rgba(20, 140, 255, 0.20)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.10)');
    g.addColorStop(1, 'rgba(10, 20, 80, 0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  } else if (grade === 'duotone') {
    ctx.fillStyle = 'rgba(255, 0, 110, 0.22)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    g.addColorStop(0, 'rgba(255, 190, 60, 0.16)');
    g.addColorStop(1, 'rgba(255, 190, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
}

function framePanel(ctx, r, pal, hero) {
  ctx.strokeStyle = hero ? pal.accent : pal.frame;
  ctx.lineWidth = hero ? Math.max(4, r.w * 0.006) : Math.max(3, r.w * 0.004);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

/** Shrinks the font until the text fits the width; returns the size used. */
function fitFont(ctx, text, maxW, start, family) {
  let size = start;
  ctx.font = `900 ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

function paintTitle(ctx, t, title, tagline, pal) {
  const family = `'Arial Black', Arial, sans-serif`;
  if (t.band) {
    ctx.fillStyle = pal.band;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(t.x, t.y, t.w, Math.max(3, t.h * 0.05));
  } else {
    const shade = ctx.createLinearGradient(0, t.y - t.h * 0.4, 0, t.y + t.h);
    shade.addColorStop(0, 'rgba(10, 5, 25, 0)');
    shade.addColorStop(1, 'rgba(10, 5, 25, 0.72)');
    ctx.fillStyle = shade;
    ctx.fillRect(t.x, t.y - t.h * 0.4, t.w, t.h * 1.4);
  }
  const words = (title.trim() || 'YOUR TITLE').toUpperCase();
  const pad = t.w * 0.04;
  const innerW = t.w - pad * 2;
  const size = fitFont(ctx, words, innerW, t.h * 0.62, family);
  ctx.textAlign = t.align === 'center' ? 'center' : 'left';
  const tx = t.align === 'center' ? t.x + t.w / 2 : t.x + pad;
  const ty = t.y + t.h * 0.62;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.strokeStyle = pal.ink;
  ctx.fillStyle = pal.title;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(words, tx, ty);
  ctx.fillText(words, tx, ty);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const tag = (tagline.trim() || '').toUpperCase();
  if (tag) {
    const tagSize = Math.max(12, Math.round(size * 0.24));
    ctx.font = `700 ${tagSize}px Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, tagSize * 0.25)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = pal.tag;
    ctx.fillText(tag, tx, t.y + t.h * 0.88);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

function paintKicker(ctx, k, pal) {
  const size = Math.max(13, Math.round(k.h * 0.55));
  ctx.font = `700 ${size}px Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, size * 0.3)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = k.align === 'center' ? 'center' : 'left';
  const x = k.align === 'center' ? k.x + k.w / 2 : k.x + k.w * 0.02;
  ctx.fillText('A NEON COAST POSTER', x, k.y + k.h * 0.75);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover onto `canvas`. `art` holds the two photos (Image
 * objects or null), the title and tagline text, the layout and palette names,
 * the export size name, and the zoom/pan values for each photo.
 */
export function drawCoverArt(canvas, art) {
  const pal = PALETTES[art.palette] ?? PALETTES.sunset;
  const [w, h] = SIZES[art.size] ?? SIZES.square;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = pal.ink;
  ctx.fillRect(0, 0, w, h);
  const plan = layoutFor(art.layout, w, h);
  paintSky(ctx, plan.sky, pal);
  paintSkyline(ctx, plan.sky, pal, 20261119);
  const palmH = plan.sky.h * 0.52;
  paintPalm(ctx, plan.sky.x + plan.sky.w * 0.06, plan.sky.y + plan.sky.h, palmH, -palmH * 0.25, pal);
  paintPalm(ctx, plan.sky.x + plan.sky.w * 0.16, plan.sky.y + plan.sky.h, palmH * 0.8, palmH * 0.2, pal);
  paintKicker(ctx, plan.kicker, pal);
  const zooms = { A: [art.zoomA, art.panA], B: [art.zoomB, art.panB] };
  for (const p of plan.panels) {
    const img = p.photo === 'B' ? (art.photoB ?? art.photoA) : art.photoA;
    const [zoom, pan] = zooms[p.photo] ?? [1, 0];
    const panelZoom = zoom * (p.zoom ?? 1);
    const panelPan = (p.pan ?? 0) + pan * 0.4;
    paintPhoto(ctx, img, p, panelZoom, panelPan, pal);
    paintGrade(ctx, p, p.grade, pal);
    framePanel(ctx, p, pal, !!p.hero);
  }
  paintTitle(ctx, plan.title, art.title, art.tagline, pal);
}
