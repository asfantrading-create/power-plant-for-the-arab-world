// Procedural textures drawn on 2D canvases: no image assets, works offline and under jsdom (where drawing is a no-op).
import * as THREE from 'three';

const cache = new Map();
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** Creates (and caches) a repeating texture drawn by `draw(ctx, size, rand)`. */
export function canvasTexture(key, size, draw, { srgb = true, w = size, h = size } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) { try { draw(ctx, w, h, rng(key.length * 7919 + 17)); } catch { /* headless: ignore */ } }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  cache.set(key, tex);
  return tex;
}

function speckle(ctx, w, h, rand, n, colors, size = 2) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = colors[Math.floor(rand() * colors.length)]; ctx.globalAlpha = .25 + rand() * .5; ctx.fillRect(rand() * w, rand() * h, size * (.5 + rand()), size * (.5 + rand())); }
  ctx.globalAlpha = 1;
}
function blotches(ctx, w, h, rand, n, color, rMin, rMax, alpha = .12) {
  // each blotch is drawn four times (wrapped) so the texture tiles without seams
  for (let i = 0; i < n; i++) { const r = rMin + rand() * (rMax - rMin); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); const x = rand() * w, y = rand() * h, a = alpha * (.5 + rand()); for (const [dx, dy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) { ctx.save(); ctx.translate(x + dx, y + dy); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
}

// ---------- ground ----------
export const sandTexture = () => canvasTexture('sand', 512, (ctx, w, h, rand) => {
  ctx.fillStyle = '#c9b187'; ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, rand, 30, '#c7ae80', 60, 220, .16); blotches(ctx, w, h, rand, 24, '#dfcaa0', 50, 200, .14);
  speckle(ctx, w, h, rand, 6000, ['#cbb184', '#dcc59a', '#c0a578', '#e3d2ae'], 2);
});
export const scrubTexture = () => canvasTexture('scrub', 512, (ctx, w, h, rand) => {
  ctx.fillStyle = '#b9a67a'; ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, rand, 50, '#8f8c5c', 30, 120, .22); blotches(ctx, w, h, rand, 40, '#c8b78a', 40, 160, .16);
  speckle(ctx, w, h, rand, 7000, ['#a89a6c', '#7f8a4e', '#cbbd93', '#6f7a45'], 2.5);
});
export const grassTexture = () => canvasTexture('grass', 512, (ctx, w, h, rand) => {
  ctx.fillStyle = '#6f9a4a'; ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, rand, 50, '#587f36', 40, 160, .22); blotches(ctx, w, h, rand, 40, '#8fb35a', 30, 120, .18);
  speckle(ctx, w, h, rand, 9000, ['#5f8b3d', '#86ad55', '#4f7a34', '#9bbd66'], 2);
});
export const gravelTexture = () => canvasTexture('gravel', 256, (ctx, w, h, rand) => {
  ctx.fillStyle = '#86867f'; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, rand, 5000, ['#6f6f69', '#9d9d97', '#5f5f5a', '#b0b0a9'], 2.5);
});
export const asphaltTexture = () => canvasTexture('asphalt', 256, (ctx, w, h, rand) => {
  ctx.fillStyle = '#4a4d52'; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, rand, 3000, ['#3d4045', '#585b60', '#33363a'], 2);
  ctx.fillStyle = '#e9e2c5'; ctx.globalAlpha = .85; ctx.fillRect(w / 2 - 3, 0, 6, h * .45); ctx.globalAlpha = 1; // dashed centre line (repeats along v)
});
export const concreteTexture = (key = 'concrete', base = '#c8cbcf') => canvasTexture(key, 512, (ctx, w, h, rand) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, rand, 50, '#9fa4a9', 30, 140, .2); blotches(ctx, w, h, rand, 30, '#e2e4e6', 20, 100, .2);
  speckle(ctx, w, h, rand, 5000, ['#b4b8bc', '#d8dadc', '#a5a9ad'], 2);
  ctx.strokeStyle = 'rgba(70,75,80,.35)'; ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  for (let x = 0; x < w; x += 256) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
});
export const riprapTexture = () => canvasTexture('riprap', 512, (ctx, w, h, rand) => {
  ctx.fillStyle = '#8a8378'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const r = 4 + rand() * 14; const g = 90 + rand() * 90; ctx.fillStyle = `rgb(${g + 10},${g},${g - 12})`; const x = rand() * w, y = rand() * h, ry = r * (.6 + rand() * .5), rot = rand() * 3; for (const [dx, dy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, ry, rot, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke(); } }
});
export const coalTexture = () => canvasTexture('coal', 256, (ctx, w, h, rand) => {
  ctx.fillStyle = '#1c1c1f'; ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, rand, 4000, ['#2c2c30', '#0e0e10', '#3a3a3e'], 3);
});

// ---------- structures ----------
/** Vertical corrugated cladding (trapezoidal sheet). */
export const claddingTexture = (key, base, dark) => canvasTexture(key, 256, (ctx, w, h) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { ctx.fillStyle = dark; ctx.globalAlpha = .16; ctx.fillRect(x, 0, 5, h); ctx.globalAlpha = .09; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 9, 0, 3, h); }
  ctx.globalAlpha = .1; ctx.fillStyle = dark; for (let y = 0; y < h; y += 128) ctx.fillRect(0, y, w, 1); ctx.globalAlpha = 1;
});
export const claddingBump = () => canvasTexture('claddingBump', 256, (ctx, w, h) => {
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { ctx.fillStyle = '#4a4a4a'; ctx.fillRect(x, 0, 5, h); ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x + 9, 0, 3, h); }
}, { srgb: false });
/** Office / control building facade with a window grid. Returns { map, emissive } so windows glow at night. */
export function facadeTextures(key, wall = '#d9d6cf', glass = '#3b5b7a', cols = 8, rows = 4) {
  const map = canvasTexture(key + '_map', 512, (ctx, w, h) => {
    ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = glass; ctx.fillRect(c * cw + cw * .18, r * ch + ch * .25, cw * .64, ch * .5); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(c * cw + cw * .18, r * ch + ch * .25, cw * .64, ch * .08); }
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(w, r * ch); ctx.stroke(); }
  });
  const emissive = canvasTexture(key + '_em', 512, (ctx, w, h, rand) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (rand() < .55) { ctx.fillStyle = rand() < .5 ? '#ffd88a' : '#ffe9b8'; ctx.fillRect(c * cw + cw * .18, r * ch + ch * .25, cw * .64, ch * .5); } }
  });
  return { map, emissive };
}
/** Industrial hall wall: cladding with a high window strip and a personnel door. */
export function hallTextures(key, base = '#cfd3d6', dark = '#8f979c') {
  const map = canvasTexture(key + '_map', 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 12) { ctx.fillStyle = dark; ctx.globalAlpha = .22; ctx.fillRect(x, 0, 4, h); } ctx.globalAlpha = 1;
    ctx.fillStyle = '#41607a'; for (let x = 8; x < w; x += 64) ctx.fillRect(x, 40, 48, 60); // window strip near the top (v is flipped when mapped)
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, h - 6, w, 6);
  });
  const emissive = canvasTexture(key + '_em', 512, (ctx, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffdca0'; for (let x = 8; x < w; x += 64) ctx.fillRect(x, 40, 48, 60); });
  return { map, emissive };
}
/** Chimney: concrete body with red/white aviation bands on the top quarter (v = 1 is the top). */
export const stackTexture = (key = 'stack', body = '#c9c9c9') => canvasTexture(key, 64, (ctx, w, h) => {
  ctx.fillStyle = body; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 2);
  const bandH = h * .06; for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#f0f0f0' : '#d0322a'; ctx.fillRect(0, i * bandH, w, bandH); }
}, { w: 64, h: 512 });
/** Photovoltaic module: dark cells with silver busbars. One repeat = one module. */
export const pvTexture = () => canvasTexture('pv', 256, (ctx, w, h) => {
  ctx.fillStyle = '#c8ccd0'; ctx.fillRect(0, 0, w, h);
  const cols = 6, rows = 10, cw = w / cols, ch = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { ctx.fillStyle = (r + c) % 2 ? '#0b1c3a' : '#0d2040'; ctx.fillRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(c * cw + cw * .48, r * ch + 2, 1.5, ch - 4); }
});
/** Louvred inlet-air filter house wall. */
export const louvreTexture = () => canvasTexture('louvre', 256, (ctx, w, h) => {
  ctx.fillStyle = '#b9bec2'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10) { ctx.fillStyle = '#6f767b'; ctx.fillRect(0, y, w, 4); ctx.fillStyle = '#e4e7e9'; ctx.fillRect(0, y + 4, w, 2); }
});
/** Chain-link fence (alpha in the image; used with alphaTest). */
export const fenceTexture = () => canvasTexture('fence', 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h); ctx.strokeStyle = '#9aa3aa'; ctx.lineWidth = 1.5;
  for (let i = -h; i < w + h; i += 12) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke(); }
});
/** Water surface normal map from summed sine waves (tangent-space, y-up encoded in RGB). */
export const waterNormalTexture = () => canvasTexture('waterNormal', 256, (ctx, w, h) => {
  const img = ctx.createImageData(w, h); const d = img.data;
  const waves = [[3, 1, .9], [5, -2, .5], [-2, 4, .6], [7, 3, .3], [1, -6, .4]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let dx = 0, dy = 0; const u = x / w * Math.PI * 2, v = y / h * Math.PI * 2;
    for (const [a, b, amp] of waves) { const ph = a * u + b * v; dx += Math.cos(ph) * a * amp * .06; dy += Math.cos(ph) * b * amp * .06; }
    const nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); const i = (y * w + x) * 4;
    d[i] = (nx / l * .5 + .5) * 255; d[i + 1] = (ny / l * .5 + .5) * 255; d[i + 2] = (nz / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}, { srgb: false });
/** Soft radial sprite used for smoke / steam. */
export const plumeSprite = () => canvasTexture('plume', 128, (ctx, w, h, rand) => {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { const r = w * (.2 + rand() * .22); const x = w / 2 + (rand() - .5) * w * .3, y = h / 2 + (rand() - .5) * h * .3; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
});
/** Radial glow for lamps and the CSP receiver. */
export const glowSprite = () => canvasTexture('glow', 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h); const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,240,200,.6)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});
/** Tree canopy billboard (palm-like silhouette). */
export const palmSprite = () => canvasTexture('palm', 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(w * .5, h); ctx.quadraticCurveTo(w * .53, h * .6, w * .5, h * .34); ctx.stroke();
  ctx.fillStyle = '#3f7a3a';
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .38; ctx.save(); ctx.translate(w * .5, h * .34); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(w * .2, 0, w * .22, w * .045, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#4f8f45'; for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .38 + .12; ctx.save(); ctx.translate(w * .5, h * .34); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(w * .18, 0, w * .19, w * .035, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
});
