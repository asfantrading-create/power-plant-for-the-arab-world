// Parametric plant components (metres). Each returns a Group positioned at its own origin (base at y = 0).
import * as THREE from 'three';
import { M } from './materials.js';
import { box, cyl, slab, lathe, sphere, tube, extrude, instanced, group, at, dynamic, label, plume, glow, seeded, V } from './primitives.js';

// ---------- generic structure ----------
/** Chimney with aviation bands, platforms and a plume anchor. */
export function stack(h, rTop = 3, rBase = 4.5, o = {}) {
  const g = group(); g.name = 'stack';
  g.add(cyl(rTop, rBase, h, o.dark ? M.stackDark : M.stack, 0, 0, 0, 32, { vRepeat: 1 }));
  g.add(cyl(rTop + .3, rTop + .3, 1.2, M.steelDark, 0, h - 1.2, 0, 32)); // cap ring
  for (const f of [.33, .66, .93]) { g.add(cyl(rTop + (rBase - rTop) * (1 - f) + 1.4, rTop + (rBase - rTop) * (1 - f) + 1.4, .35, M.steelGalv, 0, h * f, 0, 32)); }
  g.add(box(.7, h * .92, .7, M.steelGalv, rBase + .2, 0, 0)); // external stair tower
  const p = plume(o.color ?? 0xd9d9d9, o.particles ?? 36, { rise: Math.max(30, h * .45), spread: 1.1, size: rTop * 1.4, alpha: o.alpha ?? .3 }); p.position.y = h + 1; g.add(p); g.userData.plume = p;
  const lamp = glow(0xff3020, 9); lamp.position.y = h + 1.5; lamp.userData.beacon = true; g.add(lamp);
  return g;
}
/** Natural-draught (hyperbolic) cooling tower. */
export function coolingTowerHyperbolic(h = 120, rBase = 45) {
  const g = group(); g.name = 'coolingTower';
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; const r = rBase * (1 - .45 * Math.sin(t * Math.PI * .5) ** .8) + (t > .75 ? (t - .75) * rBase * .35 : 0); pts.push([r, t * h]); }
  g.add(lathe(pts, M.concrete, 48));
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.add(at(cyl(.9, 1.1, 9, M.concreteDark, 0, 0, 0, 8), Math.cos(a) * rBase * .98, 0, Math.sin(a) * rBase * .98)); } // inlet legs
  const p = plume(0xffffff, 40, { rise: 70, spread: 1.6, size: 14, alpha: .35 }); p.position.y = h + 2; g.add(p); g.userData.plume = p;
  return g;
}
/** Mechanical-draught cooling tower bank: `cells` cells in a row. */
export function coolingTowerBank(cells = 6, cellW = 12, h = 12) {
  const g = group(); g.name = 'ctBank';
  g.add(box(cells * cellW, h, cellW * 1.4, M.claddingGrey, 0, 0, 0));
  g.add(slab(cells * cellW + 4, cellW * 1.4 + 4, M.concreteDark, 0, .3, 0, { thick: .3 }));
  g.add(box(cells * cellW, 1.2, cellW * 1.4, M.steelDark, 0, h - 1, 0));
  for (let i = 0; i < cells; i++) {
    const x = (i - (cells - 1) / 2) * cellW;
    g.add(cyl(cellW * .42, cellW * .42, 2.5, M.steelGalv, x, h, 0, 24, { open: true }));
    const fan = group(); fan.position.set(x, h + 1.2, 0); fan.userData.dynamic = true; fan.userData.spin = true;
    for (let b = 0; b < 4; b++) { const bl = box(cellW * .36, .12, 1.2, M.steelDark, cellW * .18, 0, 0); const piv = group(bl); piv.rotation.y = b * Math.PI / 2; fan.add(piv); }
    g.add(fan);
  }
  return g;
}
/** Air-cooled condenser: A-frame bundles on a steel table with fans below. */
export function airCooledCondenser(bays = 4, bayW = 12) {
  const g = group(); g.name = 'acc';
  const w = bays * bayW, d = bayW * 2.2, legH = 22;
  for (let i = 0; i <= bays; i++) for (const zz of [-d / 2 + 1, d / 2 - 1]) g.add(box(1, legH, 1, M.steelDark, -w / 2 + i * bayW, 0, zz));
  g.add(box(w + 2, 1.5, d + 2, M.steelDark, 0, legH, 0));
  for (let i = 0; i < bays; i++) { const x = -w / 2 + bayW / 2 + i * bayW; g.add(cyl(bayW * .42, bayW * .42, 1.5, M.steelGalv, x, legH + 1.5, 0, 20, { open: true })); const a1 = box(bayW - 1, 10, .6, M.steelGalv, x, legH + 3, -3.6); a1.rotation.x = .55; const a2 = box(bayW - 1, 10, .6, M.steelGalv, x, legH + 3, 3.6); a2.rotation.x = -.55; g.add(a1, a2); }
  g.add(tube([[-w / 2 - 4, 3, 0], [-w / 2 - 4, legH + 12, 0], [w / 2, legH + 12, 0]], 1.4, M.pipeInsulated)); // steam duct
  return g;
}
/** Storage tank with roof, spiral stair and bund. kind: 'cone' | 'dome' | 'flat'. */
export function tank(r, h, o = {}) {
  const g = group(); g.name = 'tank';
  const mat = o.mat ?? M.tankWhite;
  g.add(cyl(r, r, h, mat, 0, 0, 0, 40));
  if ((o.roof ?? 'cone') === 'cone') g.add(cyl(.4, r + .2, r * .18, mat, 0, h, 0, 40)); else if (o.roof === 'dome') g.add(sphere(r, mat, 0, h, 0, { half: true, seg: 40 })); else g.add(cyl(r + .2, r + .2, .5, M.steelDark, 0, h, 0, 40));
  const pts = []; for (let i = 0; i <= 28; i++) { const t = i / 28; const a = t * Math.PI * 1.6; pts.push([Math.cos(a) * (r + .8), t * h + .5, Math.sin(a) * (r + .8)]); }
  g.add(tube(pts, .25, M.steelGalv, { sharp: false, segments: 60, radial: 6 }));
  g.add(cyl(.5, .5, 3, M.steelGalv, r + .8, h, 0, 8));
  if (o.bund !== false) { const b = r * 1.8; g.add(box(b * 2, 1.4, .6, M.concreteDark, 0, 0, -b), box(b * 2, 1.4, .6, M.concreteDark, 0, 0, b), box(.6, 1.4, b * 2, M.concreteDark, -b, 0, 0), box(.6, 1.4, b * 2, M.concreteDark, b, 0, 0)); }
  return g;
}
export function tankFarm(n, r, h, o = {}) {
  const g = group(); g.name = 'tankFarm';
  const cols = Math.min(n, o.cols ?? 4), pitch = r * 2.9;
  for (let i = 0; i < n; i++) { const c = i % cols, rw = Math.floor(i / cols); g.add(at(tank(r, h, { ...o, bund: false }), (c - (cols - 1) / 2) * pitch, 0, rw * pitch)); }
  const rows = Math.ceil(n / cols); const W = cols * pitch + r, D = rows * pitch + r;
  g.add(slab(W, D, M.gravel, 0, .05, (rows - 1) * pitch / 2));
  for (const [x, z, w, d] of [[0, -D / 2 + (rows - 1) * pitch / 2, W, .6], [0, D / 2 + (rows - 1) * pitch / 2, W, .6], [-W / 2, (rows - 1) * pitch / 2, .6, D], [W / 2, (rows - 1) * pitch / 2, .6, D]]) g.add(box(w, 1.5, d, M.concreteDark, x, 0, z));
  g.add(tube([[-W / 2, 1.2, -D / 2 + (rows - 1) * pitch / 2 - 1], [W / 2, 1.2, -D / 2 + (rows - 1) * pitch / 2 - 1]], .5, M.pipe));
  return g;
}
/** Power transformer with radiators, bushings and conservator. */
export function transformer(w = 8, h = 5, d = 5) {
  const g = group(); g.name = 'transformer';
  g.add(box(w, h, d, M.transformer, 0, .4, 0));
  g.add(slab(w + 3, d + 3, M.gravel, 0, .4, 0, { thick: .4 }));
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) g.add(box(.2, h * .8, d * .8, M.transformer, side * (w / 2 + .5 + i * .45), .8, 0));
  { const cons = cyl(.9, .9, w * .7, M.transformer, 0, 0, 0, 16); cons.rotation.z = Math.PI / 2; cons.position.set(0, h + 1.6, -d * .2); g.add(cons); } // conservator
  for (let i = 0; i < 3; i++) { const x = (i - 1) * w * .28; g.add(cyl(.22, .32, 2.2, M.insulator, x, h + .4, d * .15, 10), sphere(.28, M.steelGalv, x, h + 2.8, d * .15, { seg: 10, rings: 6 })); }
  g.add(box(1.2, 1.4, 1, M.steelDark, w / 2 - 1, h + .4, -d / 2 + .5));
  return g;
}
/** Steel pylon (transmission tower) with cross-arms and insulator strings; wires are added by transmissionLine(). */
export function pylon(h = 36, o = {}) {
  const g = group(); g.name = 'pylon';
  const base = o.base ?? h * .18, top = base * .35;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = cyl(.16, .28, h * .72, M.steelGalv, 0, 0, 0, 6); leg.position.set(sx * (base + top) / 4, h * .36, sz * (base + top) / 4); leg.rotation.z = -sx * Math.atan((base - top) / 2 / (h * .72)); leg.rotation.x = sz * Math.atan((base - top) / 2 / (h * .72)); g.add(leg); }
  for (const f of [.18, .4, .62]) { const s = base * (1 - f * .65); g.add(box(s, .18, .18, M.steelGalv, 0, h * f, -s / 2), box(s, .18, .18, M.steelGalv, 0, h * f, s / 2), box(.18, .18, s, M.steelGalv, -s / 2, h * f, 0), box(.18, .18, s, M.steelGalv, s / 2, h * f, 0)); }
  g.add(box(top, h * .3, top, M.steelGalv, 0, h * .7, 0), box(.5, .9, .5, M.steelGalv, 0, h - .9, 0));
  const arms = o.arms ?? [[h * .74, 9], [h * .84, 11], [h * .95, 8]];
  for (const [y, len] of arms) { g.add(box(len * 2, .28, .28, M.steelGalv, 0, y, 0)); for (const s of [-1, 1]) g.add(cyl(.14, .14, 3.2, M.insulator, s * (len - .8), y - 3.2, 0, 8)); }
  g.userData.attach = arms.flatMap(([y, len]) => [[-(len - .8), y - 3.2, 0], [len - .8, y - 3.2, 0]]);
  return g;
}
/** A line of pylons from `from` towards `dir` (unit XZ vector), `n` towers `pitch` apart, with sagging conductors. */
export function transmissionLine(from, dir, n = 5, pitch = 300, h = 38) {
  const g = group(); g.name = 'line';
  const yaw = Math.atan2(dir.x, dir.z);
  const towers = [];
  for (let i = 0; i < n; i++) { const p = pylon(h); p.position.set(from.x + dir.x * pitch * i, 0, from.z + dir.z * pitch * i); p.rotation.y = yaw + Math.PI / 2; g.add(p); towers.push(p); }
  const pts = []; const mat = new THREE.LineBasicMaterial({ color: 0xb9c0c6, transparent: true, opacity: .8 });
  for (let i = 0; i < towers.length - 1; i++) {
    const a = towers[i], b = towers[i + 1]; a.updateMatrixWorld(); b.updateMatrixWorld();
    for (let k = 0; k < a.userData.attach.length; k++) {
      const pa = V(...a.userData.attach[k]).applyMatrix4(a.matrix), pb = V(...b.userData.attach[k]).applyMatrix4(b.matrix);
      for (let s = 0; s < 12; s++) { const t0 = s / 12, t1 = (s + 1) / 12; const sag = t => -Math.sin(t * Math.PI) * pitch * .04; pts.push(pa.clone().lerp(pb, t0).add(V(0, sag(t0), 0)), pa.clone().lerp(pb, t1).add(V(0, sag(t1), 0))); }
    }
  }
  if (pts.length) { const geo = new THREE.BufferGeometry().setFromPoints(pts); const lines = new THREE.LineSegments(geo, mat); lines.userData.dynamic = true; g.add(lines); }
  return g;
}
/** Outdoor switchyard: gravel bed, gantries, busbars, breakers, disconnectors and a fence. */
export function switchyard(w = 120, d = 60, bays = 6) {
  const g = group(); g.name = 'switchyard';
  g.add(slab(w, d, M.gravel, 0, .05, 0));
  const gantryH = 14;
  for (const z of [-d / 2 + 6, d / 2 - 6]) { for (let i = 0; i <= bays; i++) { const x = -w / 2 + 4 + i * (w - 8) / bays; g.add(box(.5, gantryH, .5, M.steelGalv, x, 0, z)); } g.add(box(w - 8, .5, .5, M.steelGalv, 0, gantryH - .5, z)); for (let k = 0; k < 3; k++) g.add(tube([[-w / 2 + 4, gantryH - 2, z - 1.5 + k * 1.5], [w / 2 - 4, gantryH - 2, z - 1.5 + k * 1.5]], .09, M.steelDark)); }
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + 4 + (i + .5) * (w - 8) / bays;
    for (let k = 0; k < 3; k++) { const z = -d * .18 + k * 5; g.add(cyl(.28, .28, 4.5, M.insulator, x - 3.5, 1.2, z, 10), cyl(.28, .28, 4.5, M.insulator, x + 3.5, 1.2, z, 10), box(8.5, .7, .7, M.steelGalv, x, 5.7, z), box(1.8, 1.2, 1.8, M.steelGalv, x, 0, z)); } // breakers
    for (let k = 0; k < 3; k++) { const z = d * .2 + k * 5; g.add(cyl(.2, .2, 3, M.insulator, x, 1.8, z, 8), box(.8, 1.8, .8, M.steelGalv, x, 0, z), box(4, .18, .18, M.steelGalv, x, 4.8, z)); } // disconnectors
    g.add(tube([[x, 5.9, -d * .18], [x, 12, -d / 2 + 6]], .07, M.steelDark), tube([[x, 5.9, -d * .18 + 10], [x, 5.9, d * .2]], .07, M.steelDark));
  }
  g.add(box(6, 4, 4, M.claddingWhite, w / 2 - 8, 0, d / 2 - 8)); // relay house
  g.add(fence(w + 4, d + 4));
  return g;
}
/** Chain-link perimeter fence. */
export function fence(w, d, h = 2.6) {
  const g = group(); g.name = 'fence';
  for (const [x, z, len, rot] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, h), M.fence); const uv = panel.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 2.5, uv.getY(i) * h / 2.5);
    panel.position.set(x, h / 2, z); panel.rotation.y = rot; panel.castShadow = false; g.add(panel);
    const posts = Math.floor(len / 6); for (let i = 0; i <= posts; i++) { const t = -len / 2 + i * len / posts; g.add(rot ? cyl(.06, .06, h + .3, M.steelGalv, x, 0, t, 6) : cyl(.06, .06, h + .3, M.steelGalv, t, 0, z, 6)); }
  }
  return g;
}
/** Office / control / administration building. */
export function building(w, h, d, o = {}) {
  const g = group(); g.name = 'building';
  const floors = Math.max(1, Math.round(h / 3.6));
  g.add(box(w, floors * 3.6, d, o.mat ?? M.office, 0, 0, 0, { tile: [24, 14.4 / 4 * Math.max(1, Math.min(4, floors)) * (4 / Math.max(1, Math.min(4, floors)))] }));
  g.add(box(w + .6, .5, d + .6, M.roofDark, 0, floors * 3.6, 0));
  g.add(box(w * .25, 2.2, d * .3, M.claddingGrey, -w * .25, floors * 3.6 + .5, 0), box(2.5, 2.5, 2.5, M.steelDark, w * .3, floors * 3.6 + .5, d * .2));
  if (o.canopy !== false) g.add(box(Math.min(12, w * .5), .4, 4, M.roof, 0, 3.2, d / 2 + 2), cyl(.15, .15, 3.2, M.steelGalv, -Math.min(5, w * .2), 0, d / 2 + 3.6, 8), cyl(.15, .15, 3.2, M.steelGalv, Math.min(5, w * .2), 0, d / 2 + 3.6, 8));
  return g;
}
/** Industrial hall (turbine hall etc.): cladding with a high window strip, roof monitor, crane rails look. */
export function hall(w, h, d, o = {}) {
  const g = group(); g.name = 'hall';
  g.add(box(w, h, d, o.mat ?? M.hallWhite, 0, 0, 0));
  g.add(box(w + .8, .6, d + .8, o.roof ?? M.roof, 0, h, 0));
  if (o.monitor !== false) g.add(box(w * .8, 2.2, Math.min(6, d * .3), M.claddingGrey, 0, h + .6, 0));
  for (let i = 1; i < Math.floor(w / 12); i++) g.add(box(.5, h, .5, M.steelDark, -w / 2 + i * 12, 0, d / 2 + .1), box(.5, h, .5, M.steelDark, -w / 2 + i * 12, 0, -d / 2 - .1)); // columns
  if (o.doors) for (const x of o.doors) g.add(box(6, 6, .3, M.steelDark, x, 0, d / 2 + .2));
  return g;
}
/** Warehouse / workshop shed. */
export function shed(w, h, d, mat = M.claddingSand) { const g = group(); g.add(box(w, h, d, mat, 0, 0, 0)); const r = box(w + .6, .5, d + .6, M.roof, 0, h, 0); g.add(r); return g; }
/** Lamp post with a glow that lights at night. */
export function lampPost(h = 10) { const g = group(); g.name = 'lamp'; g.add(cyl(.09, .14, h, M.steelGalv, 0, 0, 0, 8), box(1.4, .25, .4, M.steelDark, .6, h - .1, 0)); const l = glow(0xffe6b3, 11); l.position.set(1.2, h, 0); l.userData.lamp = true; g.add(l); return g; }
/** Palm tree (trunk + frond billboard). */
export function palm(h = 9, rand = Math.random) {
  const g = group(); g.name = 'palm';
  const lean = (rand() - .5) * .18; const trunk = cyl(.22, .38, h, M.trunk, 0, 0, 0, 8); trunk.rotation.z = lean; g.add(trunk);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rand(); const f = box(3.6, .08, .9, M.leaves, 1.8, 0, 0, { cast: true }); const piv = group(f); piv.position.set(Math.sin(lean) * -h * .5 * 0 + 0, h, 0); piv.rotation.y = a; piv.rotation.z = -.5 - rand() * .4; g.add(piv); }
  return g;
}
/** Water tower / elevated tank. */
export function waterTower(h = 24, r = 5) { const g = group(); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.add(cyl(.3, .4, h - r, M.steelGalv, Math.cos(a) * r * .8, 0, Math.sin(a) * r * .8, 8)); } g.add(sphere(r, M.tankWhite, 0, h - r * .4, 0, { seg: 24, rings: 16 })); return g; }
/** Steel pipe rack carrying several pipes along x. */
export function pipeRack(len, o = {}) {
  const g = group(); g.name = 'pipeRack';
  const h = o.h ?? 6, n = o.pipes ?? 4, w = 3;
  for (let x = -len / 2; x <= len / 2; x += 8) g.add(box(.35, h, .35, M.steelDark, x, 0, -w / 2), box(.35, h, .35, M.steelDark, x, 0, w / 2), box(.3, .3, w + .4, M.steelDark, x, h - .3, 0));
  for (let i = 0; i < n; i++) { const mats = [M.pipe, M.pipeInsulated, M.pipeYellow, M.pipe]; g.add(tube([[-len / 2, h - .8 + (i % 2) * .8, -w / 2 + .5 + i * (w - 1) / Math.max(1, n - 1)], [len / 2, h - .8 + (i % 2) * .8, -w / 2 + .5 + i * (w - 1) / Math.max(1, n - 1)]], .25 + (i % 3) * .1, mats[i % mats.length])); }
  return g;
}
/** Seawater intake / outfall: concrete channel with a screen house and breakwater arms. */
export function seaIntake(len = 260, w = 40) {
  const g = group(); g.name = 'intake';
  g.add(box(w, 4, len, M.concreteDark, 0, -3, 0)); // channel floor / walls
  g.add(box(3, 5, len, M.concrete, -w / 2, -1, 0), box(3, 5, len, M.concrete, w / 2, -1, 0));
  g.add(slab(w - 6, len - 6, M.water, 0, -.2, 0, { thick: .2 }));
  g.add(box(w + 12, 9, 16, M.claddingBlue, 0, 0, -len / 2 + 10), box(w + 14, .6, 17, M.roof, 0, 9, -len / 2 + 10)); // screen / pump house
  for (let i = 0; i < 4; i++) g.add(cyl(1.1, 1.1, 3.5, M.steelDark, -w / 2 + 6 + i * (w / 3.2), 9.6, -len / 2 + 10, 12));
  g.add(box(6, 4, 90, M.riprap, -w / 2 - 10, -2, len / 2 + 30), box(6, 4, 90, M.riprap, w / 2 + 10, -2, len / 2 + 30)); // breakwater arms
  return g;
}
/** Desalination trains (MSF) beside Gulf cogeneration plants. */
export function desalTrains(n = 3, len = 90) {
  const g = group(); g.name = 'desal';
  for (let i = 0; i < n; i++) { const z = i * 22; g.add(box(len, 8, 14, M.claddingWhite, 0, 0, z)); for (let k = 0; k < 8; k++) g.add(box(1.2, 3, 14.4, M.steelDark, -len / 2 + 6 + k * (len - 12) / 7, 8, z)); g.add(cyl(2.2, 2.2, 6, M.steelGalv, len / 2 + 4, 0, z, 16), tube([[-len / 2, 9.5, z - 5], [len / 2, 9.5, z - 5]], .6, M.pipe)); }
  g.add(box(14, 6, n * 22, M.claddingGrey, len / 2 + 14, 0, (n - 1) * 11)); // vacuum / pump building
  return g;
}

// ---------- thermal units ----------
/** Gas-turbine package: enclosure, generator, inlet filter house on legs, exhaust diffuser (+ optional bypass stack). */
export function gasTurbinePackage(mw = 150, o = {}) {
  const g = group(); g.name = 'gt';
  const s = Math.max(.7, Math.min(1.6, Math.sqrt(mw / 150)));
  const L = 22 * s, W = 7 * s, H = 7 * s;
  g.add(slab(L + 14, W + 10, M.concretePad, 2, .1, 0));
  g.add(box(L, H, W, M.claddingSand, 0, 0, 0)); // turbine enclosure
  g.add(box(L * .6, H * .85, W * .9, M.claddingGrey, -L / 2 - L * .32, 0, 0)); // generator
  { const ex = cyl(W * .25, W * .25, 3, M.steelGalv, 0, 0, 0, 16); ex.rotation.z = Math.PI / 2; ex.position.set(-L / 2 - L * .62 - 1.5, H * .4, 0); g.add(ex); } // exciter
  const fh = 11 * s; g.add(box(L * .55, H * .9, W * 1.6, M.louvre, L * .05, H + 3.5, 0)); // inlet filter house
  for (const [x, z] of [[-L * .2, -W * .7], [L * .3, -W * .7], [-L * .2, W * .7], [L * .3, W * .7]]) g.add(box(.5, H + 3.5, .5, M.steelDark, x, 0, z));
  g.add(box(W * .6, 3.5, W * .5, M.steelGalv, L * .05, H, 0)); // inlet duct
  g.add(box(W * 1.1, H * .9, 6 * s, M.steelDark, L / 2 + 3 * s, H * .05, 0)); // exhaust diffuser
  if (o.bypassStack) { const st = stack(o.stackH ?? 30 * s, 2.2 * s, 2.8 * s, { dark: true, color: 0xf0e8dc, alpha: .18, particles: 22 }); st.position.set(L / 2 + 8 * s, 0, 0); g.add(st); g.userData.plume = st.userData.plume; }
  g.userData.exhaustX = L / 2 + 6 * s; g.userData.len = L; g.userData.fhTop = H + 3.5 + fh * 0 + H * .9;
  return g;
}
/** Heat-recovery steam generator with its stack: connects to a GT exhaust at x = 0 (HRSG extends along +x). */
export function hrsg(mw = 150, o = {}) {
  const g = group(); g.name = 'hrsg';
  const s = Math.max(.7, Math.min(1.6, Math.sqrt(mw / 150)));
  const L = 30 * s, W = 12 * s, H = 24 * s;
  g.add(box(8 * s, H * .55, W * .8, M.steelDark, 3 * s, H * .1, 0)); // transition duct
  g.add(box(L, H, W, M.claddingGrey, 8 * s + L / 2, 0, 0));
  for (let i = 0; i <= 4; i++) { const x = 8 * s + i * L / 4; g.add(box(.6, H + 1, .6, M.steelDark, x, 0, -W / 2 - .4), box(.6, H + 1, .6, M.steelDark, x, 0, W / 2 + .4), box(.4, .4, W + 1.2, M.steelDark, x, H + .6, 0)); }
  g.add(box(L * .9, 2.5, W * .6, M.steelGalv, 8 * s + L / 2, H, 0)); // drum / headers
  { const drum = cyl(1.6 * s, 1.6 * s, L * .8, M.pipeInsulated, 0, 0, 0, 16); drum.rotation.z = Math.PI / 2; drum.position.set(8 * s + L / 2, H + 4.2, W * .2); g.add(drum); } // steam drum
  const st = stack(o.stackH ?? 60 * s, 2.6 * s, 3.4 * s, { color: 0xf2eee6, alpha: .2, particles: 26 }); st.position.set(8 * s + L + 4 * s, 0, 0); g.add(st); g.userData.plume = st.userData.plume;
  g.add(box(2, H * .8, 2, M.steelGalv, 8 * s + L + 4 * s - 6, 0, -W / 2)); // stair tower
  g.userData.len = 8 * s + L + 8 * s;
  return g;
}
/** Steam turbine / generator hall with transformers beside it. */
export function turbineHall(mw = 400, o = {}) {
  const g = group(); g.name = 'turbineHall';
  const s = Math.max(.7, Math.min(2, Math.sqrt(mw / 400)));
  const L = o.len ?? 60 * s, W = 34 * s, H = 26 * s;
  g.add(hall(L, H, W, { mat: o.mat ?? M.hallWhite, doors: [-L * .3, L * .3] }));
  g.add(box(L * .95, 4, 3, M.claddingBlue, 0, H * .4, W / 2 + 1.5)); // crane girder annex band
  return g;
}
/** Boiler house (steel frame, cladding, ducts) feeding a stack; coal option adds mills, ESP and FGD. */
export function boilerUnit(mw = 400, o = {}) {
  const g = group(); g.name = 'boiler';
  const s = Math.max(.7, Math.min(1.8, Math.sqrt(mw / 400)));
  const W = 36 * s, D = 32 * s, H = 72 * s;
  g.add(box(W, H, D, o.mat ?? M.claddingGrey, 0, 0, 0));
  for (let i = 0; i <= 3; i++) for (const zz of [-D / 2 - .5, D / 2 + .5]) g.add(box(.9, H + 2, .9, M.steelDark, -W / 2 + i * W / 3, 0, zz)); // frame columns
  for (let f = 1; f <= 4; f++) g.add(box(W + 1.8, .5, .5, M.steelDark, 0, H * f / 4.2, -D / 2 - .5), box(W + 1.8, .5, .5, M.steelDark, 0, H * f / 4.2, D / 2 + .5));
  g.add(box(W * .5, 8, D * .5, M.steelGalv, 0, H, 0)); // penthouse / drum
  { const drum = cyl(1.8 * s, 1.8 * s, W * .8, M.pipeInsulated, 0, 0, 0, 16); drum.rotation.z = Math.PI / 2; drum.position.set(0, H + 10.2, 0); g.add(drum); }
  g.add(box(W * .3, H * .5, D * .35, M.steelDark, 0, 0, D / 2 + D * .2)); // air heater / fans
  g.add(box(W * .35, H * .45, D * .25, M.claddingGrey, -W * .25, 0, -D / 2 - D * .15)); // bunker bay
  g.add(box(W * .4, 6, D * .4, M.steelDark, W * .2, 0, D / 2 + D * .3)); // FD fans
  if (o.coal) { g.add(box(W * .9, H * .35, D * .5, M.claddingGrey, 0, 0, D / 2 + D * .7)); for (let i = 0; i < 4; i++) g.add(cyl(0, 3 * s, 7 * s, M.steelDark, -W * .35 + i * W * .23, 0, D / 2 + D * .7, 8)); } // ESP with hoppers
  g.userData.duct = [W * .2, H * .3, D / 2 + D * (o.coal ? 1 : .45)];
  return g;
}
/** Nuclear unit: containment cylinder + dome, fuel/auxiliary buildings, turbine hall, transformers. */
export function nuclearUnit(mw = 1400) {
  const g = group(); g.name = 'nuclearUnit';
  const s = Math.max(.8, Math.min(1.3, Math.sqrt(mw / 1400)));
  const r = 24 * s, h = 50 * s;
  g.add(cyl(r, r, h, M.concrete, 0, 0, 0, 48), sphere(r, M.concrete, 0, h, 0, { half: true, seg: 48, rings: 20 }));
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(at(box(1.2, h, 1.2, M.concreteDark, 0, 0, 0), Math.cos(a) * (r + .3), 0, Math.sin(a) * (r + .3))); } // buttress ribs
  g.add(box(r * 2.6, h * .5, r * 1.2, M.concreteDark, 0, 0, -r * 1.5)); // auxiliary building
  g.add(box(r * 1.4, h * .7, r * 1.6, M.concrete, r * 2.1, 0, -r * .3)); // fuel handling building
  g.add(box(r * .9, h * .45, r * .9, M.claddingWhite, -r * 2.0, 0, -r * .6)); // control building
  g.add(cyl(2.2, 2.6, h * 1.3, M.stackDark, r * 2.7, 0, -r * 1.1, 24, { vRepeat: 1 })); // vent stack
  g.add(turbineHall(mw / 2, { len: r * 4.2, mat: M.hallBlue }).translateZ(r * 3.1));
  for (let i = 0; i < 3; i++) g.add(at(transformer(10, 6, 6), -r * 1.4 + i * r * 1.4, 0, r * 5.2));
  g.add(pipeRack(r * 2.2, { h: 7, pipes: 3 }).rotateY(Math.PI / 2).translateX(0).translateZ(-r * 1.2 * 0));
  return g;
}
/** Diesel / HFO engine hall with roof radiators and exhaust silencers. */
export function engineHall(n = 6, mw = 15) {
  const g = group(); g.name = 'engineHall';
  const pitch = 8, L = n * pitch + 12, W = 26, H = 12;
  g.add(hall(L, H, W, { mat: M.claddingSand, monitor: false }));
  for (let i = 0; i < n; i++) { const x = -L / 2 + 6 + i * pitch + pitch / 2; g.add(box(5, 2, 5, M.steelDark, x, H + .6, -W * .28), cyl(1.2, 1.2, 1, M.steelGalv, x, H + 2.6, -W * .28, 16)); g.add(cyl(.8, .9, 6, M.steelDark, x, H + .6, W * .2, 12)); const st = cyl(.55, .55, 14, M.stackDark, x, H + 6, W * .2, 12, { vRepeat: 1 }); g.add(st); const p = plume(0xb9b4ad, 14, { rise: 18, size: 1.5, alpha: .3 }); p.position.set(x, H + 20.5, W * .2); g.add(p); (g.userData.plumes ||= []).push(p); }
  for (let i = 0; i < Math.ceil(n / 2); i++) g.add(box(6, 3, 8, M.steelGalv, -L / 2 + 8 + i * 12, 0, W / 2 + 6)); // radiators
  return g;
}

// ---------- renewables ----------
/** Wind turbine: tapered tower, nacelle, hub and three lofted blades (rotor group is dynamic). */
export function windTurbine(hubH = 90, rotorR = 60) {
  const g = group(); g.name = 'turbine';
  g.add(cyl(hubH * .028, hubH * .048, hubH, M.white, 0, 0, 0, 20));
  g.add(cyl(hubH * .06, hubH * .06, .8, M.concreteDark, 0, 0, 0, 20));
  g.add(box(2.5, 1.2, .3, M.steelDark, 0, hubH * .05, hubH * .045)); // door
  const nac = group(); nac.position.y = hubH; nac.userData.dynamic = true; g.add(nac); g.userData.nacelle = nac;
  const nl = rotorR * .16, nw = rotorR * .06;
  nac.add(box(nl, nw, nw, M.white, -nl * .15, -nw / 2, 0), box(nl * .3, nw * .5, nw * .4, M.claddingGrey, nl * .3, nw * .5, 0));
  const rotor = group(); rotor.position.set(0, 0, nw * .55 + nl * .1); nac.add(rotor); g.userData.rotor = rotor;
  rotor.add(cyl(nw * .5, nw * .35, nw * .9, M.white, 0, 0, 0, 20).rotateX(Math.PI / 2).translateY(0)); // hub
  const blade = bladeGeometry(rotorR);
  for (let b = 0; b < 3; b++) { const m = new THREE.Mesh(blade, M.white); m.castShadow = true; m.rotation.z = b * Math.PI * 2 / 3; rotor.add(m); }
  return g;
}
/** Lofted blade: chord tapers from root to tip with a gentle twist; length along +y. */
export function bladeGeometry(len) {
  const sections = 12, ring = 10; const verts = [], idx = [];
  for (let i = 0; i <= sections; i++) {
    const t = i / sections; const chord = len * (i < 2 ? .035 + t * .05 : .09 * (1 - t) ** .7 + .01); const thick = chord * (i < 2 ? .8 : .18); const twist = (1 - t) * .35;
    for (let k = 0; k < ring; k++) { const a = k / ring * Math.PI * 2; const x = Math.cos(a) * chord * .5, z = Math.sin(a) * thick * .5 + (i < 2 ? 0 : -chord * .1 * Math.sin(a)); const c = Math.cos(twist), s = Math.sin(twist); verts.push(x * c - z * s, t * len, x * s + z * c); }
  }
  for (let i = 0; i < sections; i++) for (let k = 0; k < ring; k++) { const a = i * ring + k, b = i * ring + (k + 1) % ring, c = (i + 1) * ring + k, d = (i + 1) * ring + (k + 1) % ring; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(verts.length / 3 * 2), 2));
  return geo;
}
/** PV table geometry (modules in landscape, 2 rows) — instanced by the PV builder. */
export function pvTableGeometry(len = 18, depth = 4.6) { const geo = new THREE.BoxGeometry(len, .08, depth); const uv = geo.attributes.uv; for (let i = 16; i < 24; i++) uv.setXY(i, uv.getX(i) * len / 2.2, uv.getY(i) * depth / 1.1); for (let i = 8; i < 16; i++) uv.setXY(i, uv.getX(i) * len / 2.2, uv.getY(i) * depth / 1.1); return geo; }
/** Inverter / transformer station used in PV blocks. */
export function inverterStation() { const g = group(); g.add(slab(9, 5, M.concretePad, 0, .1, 0), box(7, 2.6, 2.4, M.claddingWhite, -.5, 0, -.8), box(2, 2.2, 2, M.transformer, 3, 0, 1), cyl(.15, .15, 1.2, M.insulator, 3, 2.2, 1, 8)); return g; }
/** Parabolic trough collector assembly geometry (one SCA of length `len`) — instanced by the trough builder. */
export function troughGeometry(len = 100, aperture = 6) {
  const shape = new THREE.Shape(); const a = aperture / 2, f = aperture * .3;
  shape.moveTo(-a, a * a / (4 * f)); for (let x = -a; x <= a; x += a / 8) shape.lineTo(x, x * x / (4 * f)); shape.lineTo(a, a * a / (4 * f) + .08); for (let x = a; x >= -a; x -= a / 8) shape.lineTo(x, x * x / (4 * f) + .08); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-len / 2, 0, 0); return geo;
}
/** Heliostat geometry (mirror facet) — instanced. */
export function heliostatGeometry(w = 10, h = 8) { return new THREE.BoxGeometry(w, .12, h); }
/** Solar tower with receiver; `receiver` material glows with intensity. */
export function solarTower(h = 200) {
  const g = group(); g.name = 'solarTower';
  g.add(cyl(5, 8, h, M.concrete, 0, 0, 0, 32));
  g.add(cyl(6.5, 6.5, 4, M.steelDark, 0, h - 6, 0, 32));
  const recv = cyl(7, 7, 22, M.receiver, 0, h, 0, 32); g.add(recv); g.userData.receiver = recv;
  g.add(cyl(4, 4, 8, M.steelGalv, 0, h + 22, 0, 24), cyl(.4, .4, 10, M.steelGalv, 0, h + 30, 0, 8));
  const gl = glow(0xffc070, 60); gl.position.y = h + 11; g.add(gl); g.userData.glow = gl;
  return g;
}
/** Molten-salt tank pair (hot = insulated dark) on a foundation. */
export function saltTanks() { const g = group(); g.add(slab(70, 36, M.concretePad, 0, .1, 0), tank(13, 14, { mat: M.tankSilver, roof: 'dome', bund: false }).translateX(-17), tank(13, 14, { mat: M.tankSand, roof: 'dome', bund: false }).translateX(17)); return g; }

// ---------- hydro ----------
/** Gravity / arch dam wall spanning x = ±w/2, downstream is +z. */
export function damWall(w, h, o = {}) {
  const g = group(); g.name = 'dam';
  const shape = new THREE.Shape(); const base = h * (o.embankment ? 5 : .8); const crest = o.embankment ? 40 : 8;
  shape.moveTo(-base / 2, 0); shape.lineTo(base / 2, 0); shape.lineTo(crest / 2, h); shape.lineTo(-crest / 2, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 2 }); geo.rotateY(Math.PI / 2); geo.translate(-w / 2, 0, 0);
  const uv = geo.attributes.uv; const tile = o.embankment ? 14 : 10; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  const m = new THREE.Mesh(geo, o.embankment ? M.riprap : M.concrete); m.castShadow = true; m.receiveShadow = true; if (o.arch) { m.rotation.y = 0; }
  g.add(m);
  g.add(box(w, 1, crest + 2, M.asphalt, 0, h, 0, { tile: [crest + 2, 8] })); // crest road
  for (let x = -w / 2; x <= w / 2; x += 12) g.add(box(.3, 1.3, .3, M.concreteDark, x, h + 1, crest / 2 + .5), box(.3, 1.3, .3, M.concreteDark, x, h + 1, -crest / 2 - .5));
  if (!o.embankment) { for (let x = -w / 2 + 20; x < w / 2; x += 40) g.add(box(.8, 1.2, crest + 2, M.concreteDark, x, h + 1, 0)); }
  return g;
}
/** Spillway with radial gates and chute (downstream = +z). Placed on the dam wall. */
export function spillway(w = 60, h = 50, gates = 4) {
  const g = group(); g.name = 'spillway';
  const gw = w / gates;
  for (let i = 0; i <= gates; i++) g.add(box(3, h + 6, 18, M.concrete, -w / 2 + i * gw, 0, 0)); // piers
  for (let i = 0; i < gates; i++) { const x = -w / 2 + gw / 2 + i * gw; g.add(box(gw - 4, 10, 1.2, M.steelRed, x, h - 8, -4), box(gw - 4, 1.2, 6, M.steelDark, x, h + 6, 0)); }
  g.add(box(w + 4, 3, 6, M.concrete, 0, h + 6, 0)); // hoist bridge
  const chute = box(w, 4, h * 1.3, M.concrete, 0, h * .3, h * .55); chute.rotation.x = Math.atan2(h * .6, h * 1.3); g.add(chute);
  g.userData.water = slab(w - 8, h * 1.2, M.water, 0, h * .32, h * .6, { thick: .5 }); g.userData.water.rotation.x = chute.rotation.x; g.userData.water.userData.dynamic = true; g.add(g.userData.water);
  return g;
}
/** Powerhouse at the dam toe with penstocks climbing the dam face. */
export function powerhouse(units = 6, unitMw = 150, damH = 70) {
  const g = group(); g.name = 'powerhouse';
  const pitch = Math.max(14, 10 + Math.sqrt(unitMw) * 1.2), L = units * pitch + 16, W = 34, H = 24;
  g.add(hall(L, H, W, { mat: M.hallBlue, monitor: true }));
  for (let i = 0; i < units; i++) { const x = -L / 2 + 8 + i * pitch + pitch / 2; const pen = tube([[x, damH * .42, -W / 2 - 60 - damH * .25], [x, damH * .22, -W / 2 - 40], [x, H * .3, -W / 2 - 6], [x, H * .3, -W / 2 + 2]], Math.max(2.2, Math.sqrt(unitMw) * .35), M.steelDark, { sharp: false, segments: 30, radial: 14 }); g.add(pen); g.add(box(pitch * .5, 3, 2, M.steelDark, x, H, W / 2 - 4)); }
  for (let i = 0; i < Math.min(units, 8); i++) g.add(at(transformer(7, 4.5, 4.5), -L / 2 + 10 + i * Math.max(12, L / Math.min(units, 8)), 0, W / 2 + 10));
  g.add(slab(L + 20, W + 40, M.concretePad, 0, .05, 6));
  return g;
}
/** Run-of-river barrage with lift gates, road deck and a powerhouse bay at one end. */
export function barrage(w = 200, h = 18, gates = 8) {
  const g = group(); g.name = 'barrage';
  const gw = (w * .7) / gates;
  for (let i = 0; i <= gates; i++) g.add(box(2.5, h + 4, 14, M.concrete, -w / 2 + i * gw, 0, 0));
  for (let i = 0; i < gates; i++) { const x = -w / 2 + gw / 2 + i * gw; g.add(box(gw - 3, h * .7, 1, M.steelRed, x, .5, 0), box(gw - 3, .8, 1, M.steelDark, x, h + 3, 0), box(1.2, 8, 1.2, M.steelGalv, x, h + 4, 0)); }
  g.add(box(w * .7, .6, 6, M.asphalt, -w / 2 + w * .35, h + 4, 0, { tile: [6, 8] }));
  g.add(hall(w * .3, 16, 30, { mat: M.hallBlue }).translateX(w * .35).translateY(0));
  return g;
}
export { label, plume, glow, seeded, V };
