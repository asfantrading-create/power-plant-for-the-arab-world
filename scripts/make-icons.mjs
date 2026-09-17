#!/usr/bin/env node
/**
 * Generates the application icons without any native dependency:
 *   build/icon.ico (16..256 px, PNG-compressed entries), build/icon.png (512 px),
 *   src/renderer/assets/logo.png (256 px) and src/renderer/assets/logo.svg.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- tiny rasteriser ----------
function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function render(size) {
  const ss = 4; // supersampling
  const img = new Uint8ClampedArray(size * size * 4);
  const S = 512; // design space
  const bolt = [[300, 40], [150, 290], [255, 290], [205, 480], [370, 210], [265, 210]];
  const layers = [
    { type: 'circle', cx: 256, cy: 256, r: 250, color: [12, 61, 78] },          // deep teal disc
    { type: 'circle', cx: 256, cy: 256, r: 236, color: [16, 82, 104] },          // inner ring
    { type: 'circle', cx: 156, cy: 150, r: 70, color: [247, 181, 41] },          // sun
    { type: 'rect', x: 40, y: 380, w: 432, h: 60, color: [22, 122, 100] },       // ground band
    { type: 'poly', poly: [[330, 380], [345, 250], [395, 250], [410, 380]], color: [214, 226, 232] }, // cooling tower
    { type: 'rect', x: 420, y: 250, w: 18, h: 130, color: [190, 200, 210] },     // stack
    { type: 'poly', poly: bolt, color: [255, 255, 255] },                        // lightning bolt
  ];
  const sample = (x, y) => {
    let c = [0, 0, 0, 0];
    for (const L of layers) {
      let hit = false;
      if (L.type === 'circle') hit = (x - L.cx) ** 2 + (y - L.cy) ** 2 <= L.r * L.r;
      else if (L.type === 'rect') hit = x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h;
      else hit = inPolygon(x, y, L.poly);
      if (hit) c = [L.color[0], L.color[1], L.color[2], 255];
    }
    return c;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const dx = (x + (sx + 0.5) / ss) * S / size, dy = (y + (sy + 0.5) / ss) * S / size;
      const c = sample(dx, dy);
      r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
    }
    const i = (y * size + x) * 4;
    if (a > 0) { img[i] = r / a; img[i + 1] = g / a; img[i + 2] = b / a; }
    img[i + 3] = a / (ss * ss);
  }
  return img;
}

// ---------- PNG encoder ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function encodeIco(pngs) {
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = [], blobs = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size; e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); blobs.push(png); offset += png.length;
  }
  return Buffer.concat([header, ...dir, ...blobs]);
}

fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'src/renderer/assets'), { recursive: true });
const pngs = [16, 24, 32, 48, 64, 128, 256].map(size => ({ size, png: encodePng(size, render(size)) }));
fs.writeFileSync(path.join(ROOT, 'build/icon.ico'), encodeIco(pngs));
fs.writeFileSync(path.join(ROOT, 'build/icon.png'), encodePng(512, render(512)));
fs.writeFileSync(path.join(ROOT, 'src/renderer/assets/logo.png'), pngs[6].png);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="250" fill="#0c3d4e"/><circle cx="256" cy="256" r="236" fill="#105268"/><circle cx="156" cy="150" r="70" fill="#f7b529"/><rect x="40" y="380" width="432" height="60" fill="#167a64"/><polygon points="330,380 345,250 395,250 410,380" fill="#d6e2e8"/><rect x="420" y="250" width="18" height="130" fill="#bec8d2"/><polygon points="300,40 150,290 255,290 205,480 370,210 265,210" fill="#fff"/></svg>`;
fs.writeFileSync(path.join(ROOT, 'src/renderer/assets/logo.svg'), svg);
console.log('icons written: build/icon.ico, build/icon.png, src/renderer/assets/logo.png|svg');
