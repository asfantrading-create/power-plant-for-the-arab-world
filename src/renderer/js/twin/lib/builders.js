// Technology layouts. Local frame: +x east, +z inland/south; the waterfront (sea, intake, cooling) is on the -z side.
// Every builder returns { group, updaters: [(state, dt, wind) => void] } with the group's base at y = 0.
import * as THREE from 'three';
import { M } from './materials.js';
import * as P from './primitives.js';
import * as C from './components.js';
import { box, cyl, slab, group, at, instanced, label, tube } from './primitives.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const unitLoad = (st, i) => { const u = st.units && st.units[i]; return u && u.capacityMw ? Math.max(0, u.output / u.capacityMw) : 0; };
const avgLoad = (st, from, to) => { let s = 0, n = 0; for (let i = from; i < to; i++) { s += unitLoad(st, i); n++; } return n ? s / n : 0; };
export const isGcc = c => ['ARE', 'SAU', 'KWT', 'QAT', 'BHR', 'OMN'].includes(c);

/** Cooling block for inland thermal plants (returns group centred at origin, extends towards -z). */
function inlandCooling(capacityMw, kind = 'wet') {
  if (kind === 'acc') { const bays = clamp(Math.round(capacityMw / 60), 4, 24); const g = C.airCooledCondenser(Math.min(bays, 12), 12); if (bays > 12) g.add(C.airCooledCondenser(bays - 12, 12).translateZ(-40)); return { g, fans: [] }; }
  if (capacityMw >= 900) { const g = group(); const n = capacityMw >= 1800 ? 2 : 1; for (let i = 0; i < n; i++) g.add(at(C.coolingTowerHyperbolic(120, 45), (i - (n - 1) / 2) * 120, 0, 0)); return { g, towers: g.children }; }
  const cells = clamp(Math.round(capacityMw / 40), 4, 16); const g = group(); const banks = cells > 10 ? 2 : 1;
  for (let b = 0; b < banks; b++) g.add(at(C.coolingTowerBank(Math.ceil(cells / banks), 12, 12), 0, 0, -b * 30));
  return { g };
}
function collectSpinners(root, out = []) { root.traverse(o => { if (o.userData.spin) out.push(o); }); return out; }

// ---------- steam (oil / coal / shale / biomass / waste) ----------
export function buildSteam(plant, spec, o = {}) {
  const n = Math.min(spec.units, 20), mw = spec.unitMw; const coal = !!o.coal;
  const g = group(); const updaters = [];
  const s = clamp(Math.sqrt(mw / 400), .7, 1.8);
  const pitch = 40 * s + 12, L = n * pitch + 24;
  // turbine hall along x, sea side
  g.add(at(C.turbineHall(mw, { len: L }), 0, 0, -50 * s));
  // boilers behind, one per unit; stacks shared by two units
  const stacks = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * pitch;
    g.add(at(C.boilerUnit(mw, { coal }), x, 0, 10 * s));
    g.add(at(C.transformer(9 * s, 5.5 * s, 5 * s), x, 0, -50 * s - 17 * s - 8));
    if (n <= 12) { const lb = label(spec.unitLabel(i)); lb.position.set(x, 74 * s + 8, 10 * s); g.add(lb); }
    if (i % 2 === 0 || mw >= 600) {
      const shared = mw < 600 && i + 1 < n; const sx = shared ? x + pitch / 2 : x;
      const st = C.stack(clamp(80 + mw * .16, 90, 200), 3.2 * s, 5 * s, { color: coal ? 0xbdbab5 : 0xdcd9d4, alpha: coal ? .3 : .2 }); st.position.set(sx, 0, 10 * s + 15 * s + 22 * s); g.add(st);
      const from = i, to = shared ? i + 2 : i + 1; stacks.push({ st, from, to });
      g.add(tube([[x, 22 * s, 10 * s + 15 * s + 10 * s], [sx, 26 * s, 10 * s + 15 * s + 22 * s - 5 * s]], 2.4 * s, M.steelDark)); // flue duct
    }
  }
  updaters.push((st, dt, wind) => { for (const { st: stk, from, to } of stacks) stk.userData.plume.userData.update(dt, avgLoad(st, from, to), wind); });
  // fuel handling
  const zFuel = 10 * s + 15 * s + 22 * s + 60;
  if (coal) {
    const yard = group(); const piles = clamp(Math.round(spec.capacityMw / 400), 2, 6);
    for (let i = 0; i < piles; i++) { const pile = P.lathe([[0, 0], [18, 0], [16, 4], [9, 11], [0, 14]], M.coal, 24); pile.scale.set(1.6, 1, 1); pile.position.set((i - (piles - 1) / 2) * 62, 0, 0); yard.add(pile); }
    yard.add(slab(piles * 62 + 40, 80, M.concretePad, 0, .05, 0));
    const gantry = group(box(56, 1.5, 3, M.steelRed, 0, 18, 0), box(1.2, 18, 1.2, M.steelRed, -27, 0, 0), box(1.2, 18, 1.2, M.steelRed, 27, 0, 0), box(30, 2, 2.4, M.steelRed, -8, 12, -20).rotateX(-.3)); gantry.position.set(-piles * 31 + 40, 0, 12); yard.add(gantry);
    yard.add(tube([[-piles * 31 - 10, 24, 0], [piles * 31 + 10, 24, 0]], .6, M.steelDark), box(piles * 62 + 20, .4, 3, M.steelDark, 0, 23, 0)); // overhead conveyor gallery
    yard.position.set(0, 0, zFuel + 30); g.add(yard);
    const conv = box(3.5, 2.6, zFuel + 20, M.claddingGrey, -L / 2 - 30, 26, zFuel / 2 + 10); g.add(conv, box(3.5, 30, 3.5, M.steelDark, -L / 2 - 30, 0, zFuel + 20)); // conveyor to bunkers
    if (o.jetty) { const j = group(box(14, 3, 620, M.concrete, 0, -1, 0), box(60, 24, 14, M.claddingBlue, 0, 2, -290), box(2, 34, 2, M.steelRed, -10, 2, -250), box(2, 34, 2, M.steelRed, 10, 2, -250), box(50, 2, 2, M.steelRed, 0, 34, -250)); for (let k = 0; k < 6; k++) j.add(cyl(1.2, 1.4, 6, M.concreteDark, -8, -6, -300 + k * 100, 8), cyl(1.2, 1.4, 6, M.concreteDark, 8, -6, -300 + k * 100, 8)); j.position.set(-L / 2 - 90, 0, -350); j.traverse(m => { m.userData.noFootprint = true; }); g.add(j); }
  } else if (['biomass', 'waste_to_energy'].includes(plant.technology)) {
    g.add(at(C.shed(L * .8, 16, 50, M.claddingSand), 0, 0, zFuel + 20));
    if (plant.technology === 'waste_to_energy') { g.add(at(box(40 * s, 34 * s, 30 * s, M.claddingGreen, 0, 0, 0), L / 2 + 30, 0, 10 * s), at(C.shed(60, 12, 30, M.claddingGrey), L / 2 + 30, 0, zFuel)); }
  } else {
    const nt = clamp(Math.round(spec.capacityMw / 450), 2, 12); const r = clamp(18 + Math.sqrt(spec.capacityMw) * .18, 18, 34);
    g.add(at(C.tankFarm(nt, r, r * .7, { cols: Math.min(nt, 6) }), 0, 0, zFuel + r * 1.5));
    g.add(at(C.pipeRack(L * .7, { h: 6, pipes: 4 }), 0, 0, zFuel - 8));
  }
  // cooling: sea intake or towers
  let cooling = null;
  if (plant.coastal) { const intake = C.seaIntake(clamp(L * .35, 200, 320), clamp(L * .08, 30, 60)); intake.rotation.y = Math.PI; intake.position.set(-L * .2, 0, -50 * s - 40 * s - 150); g.add(intake); g.add(tube([[-L * .2, 2, -50 * s - 50 * s], [-L * .2, 2, -50 * s - 40 * s - 30]], 2, M.pipe)); }
  else { cooling = inlandCooling(spec.capacityMw, plant.technology === 'oil_shale' ? 'acc' : 'wet'); cooling.g.position.set(0, 0, -50 * s - 40 * s - 30); g.add(cooling.g); }
  if (cooling && cooling.towers) updaters.push((st, dt, wind) => cooling.towers.forEach(t => t.userData.plume.userData.update(dt, avgLoad(st, 0, n) * .9, wind)));
  const spinners = cooling ? collectSpinners(cooling.g) : []; if (spinners.length) updaters.push((st, dt) => { const l = avgLoad(st, 0, n); for (const f of spinners) f.rotation.y += dt * 6 * l; });
  // desalination for Gulf cogeneration plants
  if (plant.coastal && isGcc(plant.country) && spec.capacityMw >= 500) g.add(at(C.desalTrains(clamp(Math.round(spec.capacityMw / 500), 2, 8), 100), L / 2 + 110, 0, -50 * s - 40));
  // electrical
  const syW = clamp(L * .55, 110, 260); const sy = C.switchyard(syW, 70, clamp(Math.round(n / 2) + 2, 4, 10)); sy.position.set(-L / 2 - syW / 2 - 40, 0, -20); g.add(sy);
  g.userData.lineFrom = new THREE.Vector3(-L / 2 - syW / 2 - 40, 0, -20); g.userData.lineDir = new THREE.Vector3(-1, 0, 0);
  return { group: g, updaters };
}

// ---------- combined cycle / IGCC ----------
export function buildCombinedCycle(plant, spec, o = {}) {
  const n = Math.min(spec.units, 16), mw = spec.unitMw;
  const g = group(); const updaters = []; const plumes = [];
  const gtPkg = C.gasTurbinePackage(mw); const gtLen = gtPkg.userData.len; gtPkg.traverse(() => {});
  const blockPitch = 100 * clamp(Math.sqrt(mw / 150), .8, 1.6), blocks = Math.ceil(n / 2);
  let k = 0;
  for (let b = 0; b < blocks; b++) {
    const z = (b - (blocks - 1) / 2) * blockPitch;
    const gts = Math.min(2, n - b * 2);
    for (let u = 0; u < gts; u++) {
      const zz = z + (u - (gts - 1) / 2) * 34 * clamp(Math.sqrt(mw / 150), .8, 1.6);
      const gt = C.gasTurbinePackage(mw); gt.position.set(-gtLen * .3, 0, zz); g.add(gt);
      const h = C.hrsg(mw); h.position.set(-gtLen * .3 + gt.userData.exhaustX, 0, zz); g.add(h); plumes.push({ p: h.userData.plume, idx: k });
      if (n <= 12) { const lb = label(spec.unitLabel(k)); lb.position.set(-gtLen * .3 + gt.userData.exhaustX + 40, 44, zz); g.add(lb); }
      g.add(at(C.transformer(8, 5, 5), -gtLen * .3 - gtLen * .95 - 14, 0, zz));
      k++;
    }
    const st = C.turbineHall(mw * gts * .5, { len: 44, mat: M.hallWhite }); st.rotation.y = Math.PI / 2; st.position.set(-gtLen * .3 - gtLen * .95 - 50, 0, z); g.add(st);
    g.add(at(C.transformer(9, 5.5, 5.5), -gtLen * .3 - gtLen * .95 - 50, 0, z + 30));
  }
  updaters.push((st, dt, wind) => { for (const { p, idx } of plumes) p.userData.update(dt, unitLoad(st, idx), wind); });
  const xRight = -gtLen * .3 + gtPkg.userData.exhaustX + 80, xLeft = -gtLen * .3 - gtLen * .95 - 90;
  // gas receiving station + pipe rack along the GT line
  g.add(at(C.pipeRack(blocks * blockPitch + 40, { h: 6, pipes: 3 }).rotateY(Math.PI / 2), xRight + 20, 0, 0));
  const gasPipe = tube([[xRight + 20, 1, -blocks * blockPitch / 2 - 20], [xRight + 60, 1, -blocks * blockPitch / 2 - 20], [xRight + 60, 1, -blocks * blockPitch / 2 - 400]], .5, M.pipeYellow); gasPipe.userData.noFootprint = true;
  g.add(at(box(14, 4, 10, M.claddingGrey, 0, 0, 0), xRight + 40, 0, -blocks * blockPitch / 2 - 20), gasPipe);
  // cooling
  const zFront = -blocks * blockPitch / 2 - 60;
  if (plant.coastal) { const intake = C.seaIntake(220, 34); intake.rotation.y = Math.PI; intake.position.set(xLeft + 60, 0, zFront - 150); g.add(intake); }
  else { const cool = inlandCooling(spec.capacityMw, o.acc ? 'acc' : 'wet'); cool.g.position.set(xLeft + 80, 0, zFront - 40); g.add(cool.g); if (cool.towers) updaters.push((st, dt, wind) => cool.towers.forEach(t => t.userData.plume.userData.update(dt, avgLoad(st, 0, n), wind))); const sp = collectSpinners(cool.g); if (sp.length) updaters.push((st, dt) => { const l = avgLoad(st, 0, n); for (const f of sp) f.rotation.y += dt * 6 * l; }); }
  if (plant.coastal && isGcc(plant.country) && spec.capacityMw >= 500) g.add(at(C.desalTrains(clamp(Math.round(spec.capacityMw / 400), 2, 8), 100), xRight + 90, 0, zFront - 40));
  if (plant.technology === 'igcc') { g.add(at(cyl(6, 6, 70, M.steelGalv, 0, 0, 0, 24), xRight + 60, 0, 40), at(box(16, 60, 16, M.claddingGrey, 0, 0, 0), xRight + 90, 0, 40), at(cyl(1, 1.2, 60, M.steelDark, 0, 0, 0, 12), xRight + 120, 0, 90), at(C.tankFarm(3, 12, 10), xRight + 100, 0, -60)); }
  const sy = C.switchyard(clamp(blocks * 70, 100, 240), 70, clamp(n + 1, 4, 10)); sy.rotation.y = Math.PI / 2; sy.position.set(xLeft - 60, 0, 0); g.add(sy);
  g.userData.lineFrom = new THREE.Vector3(xLeft - 60, 0, 0); g.userData.lineDir = new THREE.Vector3(-1, 0, 0);
  return { group: g, updaters };
}
export function buildOpenCycle(plant, spec) {
  const n = Math.min(spec.units, 24), mw = spec.unitMw; const g = group(); const updaters = []; const plumes = [];
  const cols = Math.min(n, 6), rows = Math.ceil(n / cols), s = clamp(Math.sqrt(mw / 100), .7, 1.6), pitchX = 36 * s, pitchZ = 70 * s;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols); const x = (c - (cols - 1) / 2) * pitchX, z = (r - (rows - 1) / 2) * pitchZ;
    const gt = C.gasTurbinePackage(mw, { bypassStack: true, stackH: 34 * s }); gt.rotation.y = -Math.PI / 2; gt.position.set(x, 0, z); g.add(gt); plumes.push({ p: gt.userData.plume, idx: i });
    g.add(at(C.transformer(6 * s, 4 * s, 4 * s), x, 0, z + 34 * s));
  }
  updaters.push((st, dt, wind) => { for (const { p, idx } of plumes) p.userData.update(dt, unitLoad(st, idx) * .8, wind); });
  g.add(at(C.tankFarm(clamp(Math.round(spec.capacityMw / 150), 2, 6), 12, 10, { cols: 3 }), cols * pitchX / 2 + 70, 0, 0)); // distillate backup fuel
  g.add(at(box(10, 4, 8, M.claddingGrey, 0, 0, 0), -cols * pitchX / 2 - 30, 0, -rows * pitchZ / 2 - 10), at(box(14, 5, 8, M.claddingWhite, 0, 0, 0), -cols * pitchX / 2 - 30, 0, -rows * pitchZ / 2 + 10)); // gas station / black-start
  const sy = C.switchyard(clamp(cols * pitchX, 90, 220), 60, clamp(n, 3, 10)); sy.position.set(0, 0, rows * pitchZ / 2 + 34 * s + 70); g.add(sy);
  g.userData.lineFrom = new THREE.Vector3(0, 0, rows * pitchZ / 2 + 34 * s + 70); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  return { group: g, updaters };
}
export function buildDiesel(plant, spec) {
  const n = Math.min(spec.units, 24); const g = group(); const updaters = [];
  const halls = Math.ceil(n / 8); const plumes = []; let k = 0;
  for (let hI = 0; hI < halls; hI++) { const cnt = Math.min(8, n - hI * 8); const h = C.engineHall(cnt, spec.unitMw); h.position.set(0, 0, (hI - (halls - 1) / 2) * 60); g.add(h); for (const p of h.userData.plumes) plumes.push({ p, idx: k++ }); }
  updaters.push((st, dt, wind) => { for (const { p, idx } of plumes) p.userData.update(dt, unitLoad(st, idx) * .7, wind); });
  g.add(at(C.tankFarm(clamp(Math.round(spec.capacityMw / 30), 2, 6), 9, 9, { cols: 3 }), -90, 0, 10), at(box(8, 4, 6, M.claddingWhite, 0, 0, 0), 60, 0, -50), at(C.transformer(6, 4, 4), 70, 0, 10), at(C.transformer(6, 4, 4), 70, 0, 24));
  const sy = C.switchyard(70, 40, 3); sy.position.set(110, 0, 10); g.add(sy); g.userData.lineFrom = new THREE.Vector3(110, 0, 10); g.userData.lineDir = new THREE.Vector3(1, 0, 0);
  return { group: g, updaters };
}
export function buildNuclear(plant, spec) {
  const n = Math.min(spec.units, 6), mw = spec.unitMw; const g = group(); const updaters = [];
  const pitch = 250 * clamp(Math.sqrt(mw / 1400), .8, 1.3);
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * pitch; const u = C.nuclearUnit(mw); u.position.set(x, 0, 0); g.add(u); const lb = label(spec.unitLabel(i)); lb.position.set(x, 90, 0); g.add(lb); }
  const W = n * pitch + 120;
  if (plant.coastal) { const intake = C.seaIntake(300, 60); intake.rotation.y = Math.PI; intake.position.set(0, 0, -270); g.add(intake); g.add(box(W * .9, 5, 12, M.riprap, 0, -2, -520)); }
  else { const cool = inlandCooling(spec.capacityMw); cool.g.position.set(0, 0, -200); g.add(cool.g); if (cool.towers) updaters.push((st, dt, wind) => cool.towers.forEach(t => t.userData.plume.userData.update(dt, avgLoad(st, 0, n), wind))); }
  const sy = C.switchyard(clamp(W * .5, 160, 320), 90, clamp(n * 2 + 2, 6, 12)); sy.position.set(0, 0, 260); g.add(sy);
  g.add(at(C.building(60, 14, 24), -W / 2 + 60, 0, 200), at(C.building(40, 7, 18, { mat: M.officeDark }), -W / 2 + 120, 0, 200), at(C.waterTower(26, 6), W / 2 - 60, 0, 200));
  g.userData.lineFrom = new THREE.Vector3(0, 0, 300); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  return { group: g, updaters };
}

// ---------- solar ----------
export function buildPV(plant, spec, o = {}) {
  const g = group(); const updaters = [];
  const tables = clamp(Math.round(spec.capacityMw * (o.density ?? 9)), 80, 4200);
  const perBlock = 240, blocks = Math.ceil(tables / perBlock), bCols = Math.ceil(Math.sqrt(blocks * 1.3)), bRows = Math.ceil(blocks / bCols);
  const rows = 12, cols = 20, tLen = 18, tDepth = 4.6, pitchX = 6.2, pitchZ = tLen + 6; // table long axis along z (N–S tracker axis)
  const blockW = cols * pitchX + 12, blockD = rows * pitchZ + 12;
  const geo = C.pvTableGeometry(tDepth, tLen); const inst = instanced(geo, M.pv, blocks * rows * cols);
  const postGeo = new THREE.CylinderGeometry(.12, .12, 2.2, 6); const posts = instanced(postGeo, M.steelGalv, blocks * rows * cols * 2);
  const dummy = new THREE.Object3D(); const cells = []; let k = 0, kp = 0;
  for (let b = 0; b < blocks; b++) {
    const bc = b % bCols, br = Math.floor(b / bCols); const bx = (bc - (bCols - 1) / 2) * blockW, bz = (br - (bRows - 1) / 2) * blockD;
    const cnt = Math.min(perBlock, tables - b * perBlock);
    for (let i = 0; i < cnt; i++) { const c = i % cols, r = Math.floor(i / cols); const x = bx + (c - (cols - 1) / 2) * pitchX, z = bz + (r - (rows - 1) / 2) * pitchZ; cells.push({ x, z }); for (const dz of [-tLen * .3, tLen * .3]) { dummy.position.set(x, 1.1, z + dz); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); posts.setMatrixAt(kp++, dummy.matrix); } }
    g.add(at(C.inverterStation(), bx + blockW / 2 - 8, 0, bz + blockD / 2 - 6));
    g.add(slab(blockW, 6, M.gravel, bx, .02, bz + blockD / 2 - 2));
  }
  posts.count = kp;
  g.add(inst, posts);
  const W = bCols * blockW + 40, D = bRows * blockD + 40;
  g.add(slab(W, 8, M.asphalt, 0, .03, D / 2 + 30, { tile: [8, 8] }));
  const sy = C.switchyard(clamp(W * .25, 70, 160), 46, clamp(blocks, 2, 6)); sy.position.set(0, 0, D / 2 + 70); g.add(sy);
  g.add(at(C.building(28, 7, 14), -W * .25, 0, D / 2 + 70), at(C.shed(30, 8, 16), W * .25, 0, D / 2 + 70));
  for (let i = 0; i < clamp(Math.round(W / 250), 2, 8); i++) g.add(at(C.lampPost(9), -W / 2 + 40 + i * (W - 80) / Math.max(1, clamp(Math.round(W / 250), 2, 8) - 1), 0, D / 2 + 36));
  g.userData.lineFrom = new THREE.Vector3(0, 0, D / 2 + 90); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  const setTilt = tilt => { let j = 0; for (const c of cells) { dummy.position.set(c.x, 2.2, c.z); dummy.rotation.set(0, 0, tilt); dummy.updateMatrix(); inst.setMatrixAt(j++, dummy.matrix); } inst.count = j; inst.instanceMatrix.needsUpdate = true; };
  setTilt(0); let last = null;
  updaters.push(st => { const el = st.sun ? st.sun.elevation : 0, az = st.sun ? st.sun.azimuth : 180; const tilt = el > 0 ? clamp(Math.sin(az * Math.PI / 180) * (1 - el / 95), -1, 1) * -.85 : 0; if (last !== null && Math.abs(tilt - last) < .01) return; last = tilt; setTilt(tilt); });
  return { group: g, updaters };
}
export function buildTrough(plant, spec, o = {}) {
  const g = group(); const updaters = [];
  const scas = clamp(Math.round(spec.capacityMw * 3.2), 24, 400), len = 120, aperture = 6;
  const pitchX = 17, pitchZ = len + 12;
  const cols = Math.ceil(Math.sqrt(scas * pitchZ / pitchX)), rows = Math.ceil(scas / cols);
  const geo = C.troughGeometry(len, aperture); geo.rotateY(Math.PI / 2); // long axis along z
  const inst = instanced(geo, M.mirror, scas); const dummy = new THREE.Object3D(); const pos = [];
  const pylonGeo = new THREE.BoxGeometry(.6, 3.2, .6); const pylons = instanced(pylonGeo, M.steelGalv, scas * 5); let kp = 0;
  const hce = instanced(new THREE.CylinderGeometry(.09, .09, len, 6).rotateX(Math.PI / 2), M.glassDark, scas);
  for (let i = 0; i < scas; i++) { const c = i % cols, r = Math.floor(i / cols); const x = (c - (cols - 1) / 2) * pitchX, z = (r - (rows - 1) / 2) * pitchZ; pos.push({ x, z }); for (let p = 0; p < 5; p++) { dummy.position.set(x, 1.6, z - len / 2 + p * len / 4); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pylons.setMatrixAt(kp++, dummy.matrix); } }
  pylons.count = kp; g.add(inst, pylons, hce);
  const W = cols * pitchX + 40, D = rows * pitchZ + 40;
  g.add(tube([[-W / 2, 2.6, 0], [W / 2, 2.6, 0]], .6, M.pipeInsulated), tube([[-W / 2, 2.6, 3], [W / 2, 2.6, 3]], .6, M.pipeInsulated)); // header pipes
  const pbX = W / 2 + 90;
  g.add(at(C.turbineHall(spec.capacityMw, { len: 50, mat: M.hallWhite }), pbX, 0, 0), at(C.airCooledCondenser(clamp(Math.round(spec.capacityMw / 12), 4, 12), 12), pbX + 10, 0, -70), at(C.saltTanks(), pbX, 0, 60), at(C.transformer(8, 5, 5), pbX + 40, 0, 30), at(C.transformer(8, 5, 5), pbX + 40, 0, 45));
  g.add(at(cyl(1.4, 1.8, 40, M.stackDark, 0, 0, 0, 16, { vRepeat: 1 }), pbX - 30, 0, 40)); // auxiliary boiler stack
  if (o.boosters) g.add(at(cyl(1.6, 2, 55, M.stackDark, 0, 0, 0, 16, { vRepeat: 1 }), pbX - 30, 0, 60), at(box(20, 14, 16, M.claddingGrey, 0, 0, 0), pbX - 30, 0, 90));
  g.add(at(C.building(26, 7, 14), pbX + 30, 0, 100), at(C.switchyard(80, 44, 3), pbX + 40, 0, -10 - 90));
  g.userData.lineFrom = new THREE.Vector3(pbX + 40, 0, -100); g.userData.lineDir = new THREE.Vector3(0, 0, -1);
  const setRot = rot => { for (let i = 0; i < pos.length; i++) { dummy.position.set(pos[i].x, 3.2, pos[i].z); dummy.rotation.set(0, 0, rot); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); dummy.position.set(pos[i].x + Math.sin(rot) * -aperture * .3, 3.2 + Math.cos(rot) * aperture * .3, pos[i].z); dummy.updateMatrix(); hce.setMatrixAt(i, dummy.matrix); } inst.instanceMatrix.needsUpdate = true; hce.instanceMatrix.needsUpdate = true; };
  let last = null;
  updaters.push(st => { const el = st.sun ? st.sun.elevation : 0, az = st.sun ? st.sun.azimuth : 180; const rot = el > 0 ? clamp(Math.atan2(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180)), -1.4, 1.4) * -1 : 1.4; if (last !== null && Math.abs(rot - last) < .01) return; last = rot; setRot(rot); });
  setRot(1.4);
  return { group: g, updaters };
}
export function buildTower(plant, spec, o = {}) {
  const g = group(); const updaters = [];
  const towerH = o.towerH ?? clamp(120 + spec.capacityMw * .8, 120, 260);
  const tower = C.solarTower(towerH); g.add(tower);
  const count = clamp(Math.round(spec.capacityMw * 28), 500, 5000);
  const inst = instanced(C.heliostatGeometry(10, 8), M.mirror, count); const pedestals = instanced(new THREE.CylinderGeometry(.3, .35, 3.2, 5), M.steelGalv, count);
  const positions = []; const dummy = new THREE.Object3D(); let placed = 0, ring = 0;
  while (placed < count) { const r = 70 + ring * 13; const nIn = Math.floor(2 * Math.PI * r / 12); for (let i = 0; i < nIn && placed < count; i++) { const a = i / nIn * Math.PI * 2 + (ring % 2) * .5 / nIn * Math.PI * 2; positions.push(new THREE.Vector3(Math.cos(a) * r, 4.2, Math.sin(a) * r)); dummy.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pedestals.setMatrixAt(placed, dummy.matrix); placed++; } ring++; }
  g.add(inst, pedestals);
  const R = 70 + ring * 13;
  g.add(at(C.saltTanks(), 0, 0, R + 60), at(C.turbineHall(spec.capacityMw, { len: 46, mat: M.hallWhite }), 80, 0, R + 60), at(C.airCooledCondenser(clamp(Math.round(spec.capacityMw / 12), 4, 12), 12), 90, 0, R + 130), at(C.transformer(8, 5, 5), 130, 0, R + 60), at(C.building(26, 7, 14), -90, 0, R + 60), at(C.switchyard(80, 44, 3), -110, 0, R + 130));
  g.userData.lineFrom = new THREE.Vector3(-110, 0, R + 130); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  const target = new THREE.Vector3(0, towerH + 11, 0);
  updaters.push(st => {
    const el = st.sun ? st.sun.elevation : -10, az = st.sun ? st.sun.azimuth : 0;
    const sunDir = new THREE.Vector3(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180), -Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180));
    const active = el > 3 && (st.dni || 0) > 50;
    for (let i = 0; i < positions.length; i++) { const p = positions[i]; dummy.position.copy(p); if (active) { const toT = target.clone().sub(p).normalize(); const nrm = sunDir.clone().add(toT).normalize(); dummy.lookAt(p.clone().add(nrm)); dummy.rotateX(Math.PI / 2); } else dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); }
    inst.instanceMatrix.needsUpdate = true;
    const inten = active ? clamp((st.fieldMwth || 0) / (spec.capacityMw * 3), 0, 1) : 0;
    tower.userData.receiver.material.emissiveIntensity = inten * 3; tower.userData.glow.material.opacity = inten * .9;
  });
  return { group: g, updaters };
}

// ---------- wind ----------
export function buildWind(plant, spec) {
  const g = group(); const updaters = [];
  const n = Math.min(spec.units, 120), mw = spec.unitMw;
  const hub = clamp(45 + mw * 16, 50, 125), R = hub * .62, D = R * 2;
  const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
  const pitchX = Math.min(D * 4.5, Math.max(D * 2.6, 3000 / cols)), pitchZ = Math.min(D * 7, Math.max(D * 3.5, 2600 / rows)); // large farms are packed tighter so the site stays within the terrain
  const proto = C.windTurbine(hub, R);
  const towerGeo = new THREE.CylinderGeometry(hub * .028, hub * .048, hub, 16); towerGeo.translate(0, hub / 2, 0);
  const nacGeo = new THREE.BoxGeometry(R * .16, R * .06, R * .06); nacGeo.translate(-R * .02, hub, 0);
  const hubGeo = new THREE.CylinderGeometry(R * .03, R * .022, R * .055, 16).rotateX(Math.PI / 2); hubGeo.translate(0, hub, R * .06);
  const towers = instanced(towerGeo, M.white, n), nacs = instanced(nacGeo, M.white, n), hubs = instanced(hubGeo, M.white, n), blades = instanced(C.bladeGeometry(R), M.white, n * 3);
  const rand = P.seeded(11); const turbines = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); const x = (c - (cols - 1) / 2) * pitchX + (rand() - .5) * D, z = (r - (rows - 1) / 2) * pitchZ + (rand() - .5) * D; turbines.push({ x, z, phase: rand() * Math.PI * 2, yaw: 0 }); dummy.position.set(x, 0, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); towers.setMatrixAt(i, dummy.matrix); nacs.setMatrixAt(i, dummy.matrix); hubs.setMatrixAt(i, dummy.matrix); }
  g.add(towers, nacs, hubs, blades);
  for (let r = 0; r < rows; r++) g.add(slab(cols * pitchX + 60, 5, M.gravel, 0, .02, (r - (rows - 1) / 2) * pitchZ + D * .3)); // access tracks
  const W = cols * pitchX + 100, Dz = rows * pitchZ + 100;
  g.add(at(C.switchyard(clamp(W * .12, 60, 120), 40, 3), 0, 0, Dz / 2 + 40), at(C.building(22, 7, 12), -70, 0, Dz / 2 + 40), at(cyl(.3, .4, hub, M.steelGalv, 0, 0, 0, 8), W / 2 - 30, 0, -Dz / 2 + 30)); // substation, O&M, met mast
  g.userData.lineFrom = new THREE.Vector3(0, 0, Dz / 2 + 60); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  const m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let angle = 0;
  const setBlades = (yaw) => { let j = 0; for (const t of turbines) { for (let b = 0; b < 3; b++) { m1.makeTranslation(t.x, hub, t.z); m2.makeRotationY(yaw); m1.multiply(m2); m2.makeTranslation(0, 0, R * .09); m1.multiply(m2); e.set(0, 0, angle + t.phase + b * Math.PI * 2 / 3); q.setFromEuler(e); m2.makeRotationFromQuaternion(q); m1.multiply(m2); blades.setMatrixAt(j++, m1); } } blades.instanceMatrix.needsUpdate = true; };
  setBlades(0);
  updaters.push((st, dt) => { const rpm = st.rotorRpm || 0; angle += rpm / 60 * Math.PI * 2 * dt; setBlades(0); });
  proto.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  return { group: g, updaters };
}

// ---------- hydro ----------
export function buildHydroDam(plant, spec, o = {}) {
  const g = group(); const updaters = [];
  const n = Math.min(spec.units, 16), mw = spec.unitMw;
  const embankment = !!o.embankment, damH = o.damH ?? clamp(50 + Math.sqrt(spec.capacityMw) * 1.4, 45, 115), damW = o.damW ?? clamp(260 + n * 20, 300, 700);
  g.add(C.damWall(damW, damH, { embankment }));
  const reservoirLevel = { y: damH * .86 };
  const res = slab(damW + 2600, 3000, M.waterLake, 0, reservoirLevel.y, -1500 - (embankment ? damH * 2.2 : damH * .3), { thick: 1 }); res.userData.dynamic = true; res.userData.noFootprint = true; res.castShadow = false; g.add(res);
  const tail = slab(damW * .28, 1400, M.waterLake, o.tailX ?? 0, 3, 700 + (embankment ? damH * 2.2 : damH * .35), { thick: .6 }); tail.userData.dynamic = true; tail.userData.noFootprint = true; tail.castShadow = false; g.add(tail);
  const toe = embankment ? damH * 2.2 : damH * .4;
  const ph = C.powerhouse(n, mw, damH); ph.position.set(o.phX ?? damW * .18, 0, toe + 60); g.add(ph);
  const sp = C.spillway(clamp(n * 8, 40, 120), damH * .55, clamp(Math.round(n / 3), 3, 8)); sp.position.set(-damW * .28, damH * .4, embankment ? -damH * .3 : 6); g.add(sp);
  updaters.push(st => { const lvl = clamp(st.reservoirLevel ?? .85, 0, 1); res.position.y = damH * (.6 + .28 * lvl); sp.userData.water.visible = lvl > .97; });
  const sy = C.switchyard(clamp(n * 22, 90, 220), 60, clamp(Math.round(n / 2) + 1, 3, 8)); sy.position.set((o.phX ?? damW * .18) + 40, 0, toe + 190); g.add(sy);
  g.add(at(C.building(30, 7, 14), (o.phX ?? damW * .18) + 40, 0, toe + 270));
  g.userData.lineFrom = new THREE.Vector3((o.phX ?? damW * .18) + 40, 0, toe + 230); g.userData.lineDir = new THREE.Vector3(0, 0, 1);
  g.userData.valley = { halfWidth: damW / 2 + 30, height: damH * 2.2, dir: new THREE.Vector3(0, 0, 1) };
  if (o.monument) { const mon = group(); for (let i = 0; i < 5; i++) { const petal = box(6, 72, 2.4, M.concrete, 0, 0, 0); petal.rotation.z = (i - 2) * .16; const piv = group(petal); piv.rotation.y = i * Math.PI * 2 / 5; mon.add(piv); } mon.add(cyl(10, 12, 3, M.concrete, 0, 0, 0, 24)); mon.position.set(damW * .42, damH, 0); g.add(mon); }
  return { group: g, updaters, footprintZ: [-600, toe + 260] };
}
export function buildRunOfRiver(plant, spec) {
  const g = group(); const updaters = [];
  const n = Math.min(spec.units, 12); const w = clamp(140 + n * 18, 160, 360);
  g.add(C.barrage(w, 18, clamp(n + 2, 4, 10)));
  const up = slab(w * .9, 1600, M.waterLake, 0, 14, -820, { thick: 1 }); up.userData.dynamic = true; up.userData.noFootprint = true; up.castShadow = false; g.add(up);
  const down = slab(w * .8, 1600, M.waterLake, 0, 4, 820, { thick: .6 }); down.userData.dynamic = true; down.userData.noFootprint = true; down.castShadow = false; g.add(down);
  g.add(at(C.switchyard(90, 46, 3), w / 2 + 90, 0, 80), at(C.building(24, 7, 12), w / 2 + 90, 0, 150), at(C.transformer(7, 4.5, 4.5), w * .35, 0, 40), at(C.transformer(7, 4.5, 4.5), w * .35 + 14, 0, 40));
  updaters.push(st => { up.position.y = 12 + 4 * clamp(st.reservoirLevel ?? .85, 0, 1); });
  g.userData.lineFrom = new THREE.Vector3(w / 2 + 90, 0, 110); g.userData.lineDir = new THREE.Vector3(1, 0, 0);
  g.userData.river = { halfWidth: w * .45, depth: 8, dir: new THREE.Vector3(0, 0, 1) };
  return { group: g, updaters };
}
