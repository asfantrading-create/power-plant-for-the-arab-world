// Procedural 3D scenes (three.js) for each technology plus plant-specific "hero" layouts.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MAT = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xbfc7cf, roughness: .9 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8a9bab, metalness: .6, roughness: .4 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3b4650, roughness: .8 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8edf1, roughness: .7 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2a6f9e, roughness: .6 }),
  water: new THREE.MeshStandardMaterial({ color: 0x1f6f9f, transparent: true, opacity: .85, roughness: .2, metalness: .1 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x102a4c, metalness: .7, roughness: .25 }),
  mirror: new THREE.MeshStandardMaterial({ color: 0xcfe6ff, metalness: .9, roughness: .05 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: .6 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: .6 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: .6 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f8f6a, roughness: .7 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fd3f5, transparent: true, opacity: .55, roughness: .1 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 1 }),
  sand: new THREE.MeshStandardMaterial({ color: 0xc9b184, roughness: 1 }),
};
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m; };
const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; return m; };

function makeLabel(text, color = '#e6eef5') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 48px Cairo, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(8,18,28,.65)'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color; ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(40, 10, 1);
  return sp;
}

/** Simple smoke/steam plume made of sprites; intensity 0..1 controls emission. */
function makePlume(color = 0xdddddd, count = 40) {
  const g = new THREE.Group();
  const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: .35, depthWrite: false });
  const parts = [];
  for (let i = 0; i < count; i++) { const s = new THREE.Sprite(mat.clone()); s.userData = { life: Math.random(), speed: .6 + Math.random() * .6, drift: (Math.random() - .5) * .4 }; s.scale.set(2, 2, 1); g.add(s); parts.push(s); }
  g.userData.update = (dt, intensity, windDir = 1) => {
    for (const p of parts) {
      if (intensity <= 0.02) { p.visible = false; continue; }
      p.visible = true;
      p.userData.life += dt * .25 * p.userData.speed;
      if (p.userData.life > 1) p.userData.life = 0;
      const l = p.userData.life;
      p.position.set(l * 14 * windDir + p.userData.drift * l * 8, l * 22 + 1, p.userData.drift * l * 6);
      const sc = 2 + l * 9 * intensity; p.scale.set(sc, sc, 1);
      p.material.opacity = (1 - l) * .35 * Math.min(1, intensity * 1.5);
    }
  };
  return g;
}

// ---------- technology builders (each returns { group, update(state, dt, sun), cameraDistance }) ----------
function buildCombinedCycle(spec) {
  const g = new THREE.Group(); const plumes = [];
  const blocks = Math.min(spec.units, 8); const pitch = 70;
  for (let i = 0; i < blocks; i++) {
    const x = (i - (blocks - 1) / 2) * pitch;
    const b = new THREE.Group(); b.position.x = x;
    b.add(box(28, 12, 20, MAT.steel, 0, 0, 30)); // gas turbine hall
    b.add(cyl(3.5, 3.5, 6, MAT.dark, -8, 0, 44), cyl(3.5, 3.5, 6, MAT.dark, 8, 0, 44)); // air intake filters
    b.add(box(24, 26, 16, MAT.concrete, 0, 0, 5)); // HRSG
    const stack = cyl(2.4, 2.8, 48, MAT.white, 0, 0, -8); b.add(stack);
    b.add(box(30, 14, 22, MAT.blue, 0, 0, -32)); // steam turbine hall
    b.add(box(8, 5, 6, MAT.orange, -22, 0, -32), box(8, 5, 6, MAT.orange, 22, 0, -32)); // transformers
    const plume = makePlume(0xe6e6e6); plume.position.set(0, 48, -8); b.add(plume); plumes.push(plume);
    const lb = makeLabel(spec.unitLabel(i)); lb.position.set(0, 60, -8); b.add(lb);
    g.add(b);
  }
  g.add(box(blocks * pitch + 40, 1, 20, MAT.water, 0, -.4, -60)); // cooling water channel / sea
  g.add(box(blocks * pitch + 30, 4, 10, MAT.dark, 0, 0, 62)); // switchyard
  for (let i = 0; i < 6; i++) g.add(cyl(.4, .6, 26, MAT.steel, (i - 2.5) * (blocks * pitch / 6), 0, 62, 6));
  return { group: g, cameraDistance: blocks * pitch * .9 + 120, update: (st, dt, windDir) => plumes.forEach((p, i) => { const u = st.units[i]; p.userData.update(dt, u ? u.output / u.capacityMw : 0, windDir); }) };
}
function buildOpenCycle(spec) {
  const g = new THREE.Group(); const plumes = [];
  const n = Math.min(spec.units, 12); const cols = Math.min(n, 6), pitch = 34;
  for (let i = 0; i < n; i++) {
    const x = ((i % cols) - (cols - 1) / 2) * pitch, z = Math.floor(i / cols) * 50 - 20;
    g.add(box(20, 8, 12, MAT.steel, x, 0, z), cyl(2.5, 2.5, 5, MAT.dark, x + 6, 0, z + 12), cyl(2, 2.3, 22, MAT.white, x - 6, 0, z - 12));
    const p = makePlume(0xf0e6d6, 25); p.position.set(x - 6, 22, z - 12); g.add(p); plumes.push(p);
  }
  g.add(box(cols * pitch + 30, 4, 10, MAT.dark, 0, 0, 60));
  return { group: g, cameraDistance: cols * pitch + 120, update: (st, dt, windDir) => plumes.forEach((p, i) => { const u = st.units[i]; p.userData.update(dt, u ? u.output / u.capacityMw : 0, windDir); }) };
}
function buildSteam(spec, coal = false) {
  const g = new THREE.Group(); const plumes = [];
  const n = Math.min(spec.units, 8), pitch = 60;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * pitch;
    g.add(box(34, 44, 30, MAT.concrete, x, 0, 10)); // boiler house
    g.add(box(40, 16, 26, MAT.blue, x, 0, -30)); // turbine hall
    g.add(box(10, 6, 8, MAT.orange, x, 0, -52)); // GSU transformer
    if (i % 2 === 0) { const s = cyl(3, 4, 120, MAT.white, x + pitch / 2 - (n === 1 ? pitch / 2 : 0), 0, 34); g.add(s); const p = makePlume(coal ? 0xbdbdbd : 0xdcdcdc, 50); p.position.set(s.position.x, 120, 34); g.add(p); plumes.push({ p, idx: i }); }
    const lb = makeLabel(spec.unitLabel(i)); lb.position.set(x, 54, 10); g.add(lb);
  }
  if (coal) {
    for (let i = 0; i < 4; i++) g.add(cyl(0, 14, 12, MAT.coal, -90 + i * 34, 0, 70, 12));
    g.add(box(140, 2, 4, MAT.dark, -40, 12, 45).translateY(6));
    const ct = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(22, 0), new THREE.Vector2(15, 40), new THREE.Vector2(13, 60), new THREE.Vector2(15, 80)], 32), MAT.concrete); ct.position.set(n * pitch / 2 + 50, 0, -10); g.add(ct);
    const p = makePlume(0xffffff, 40); p.position.set(ct.position.x, 80, -10); g.add(p); plumes.push({ p, idx: 0, ct: true });
  } else g.add(box(n * pitch + 60, 1, 24, MAT.water, 0, -.4, -80));
  return { group: g, cameraDistance: n * pitch + 160, update: (st, dt, windDir) => plumes.forEach(({ p, idx }) => { const u = st.units[idx]; p.userData.update(dt, u ? u.output / u.capacityMw : 0, windDir); }) };
}
function buildNuclear(spec) {
  const g = new THREE.Group(); const n = Math.min(spec.units, 6), pitch = 110;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * pitch;
    const cont = cyl(22, 22, 44, MAT.concrete, x, 0, 20); g.add(cont);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), MAT.concrete); dome.position.set(x, 44, 20); g.add(dome);
    g.add(box(30, 20, 40, MAT.white, x + 30, 0, 22)); // auxiliary building
    g.add(box(70, 22, 34, MAT.blue, x, 0, -40)); // turbine hall
    g.add(box(12, 7, 9, MAT.orange, x - 20, 0, -70), box(12, 7, 9, MAT.orange, x + 20, 0, -70));
    const lb = makeLabel(spec.unitLabel(i)); lb.position.set(x, 80, 20); g.add(lb);
  }
  g.add(box(n * pitch + 80, 1, 60, MAT.water, 0, -.4, -120));
  g.add(box(n * pitch + 40, 5, 12, MAT.dark, 0, 0, -84)); // intake structure
  for (let i = 0; i < 8; i++) g.add(cyl(.5, .7, 30, MAT.steel, (i - 3.5) * (n * pitch / 8), 0, 90, 6));
  return { group: g, cameraDistance: n * pitch + 180, update: () => {} };
}
function buildPV(spec) {
  const g = new THREE.Group();
  const total = Math.min(3000, Math.max(200, Math.round(spec.capacityMw * 3)));
  const cols = Math.ceil(Math.sqrt(total * 2)), rows = Math.ceil(total / cols);
  const geo = new THREE.BoxGeometry(4, .15, 2.2);
  const inst = new THREE.InstancedMesh(geo, MAT.panel, cols * rows);
  const dummy = new THREE.Object3D(); let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { dummy.position.set((c - cols / 2) * 5, 2, (r - rows / 2) * 7); dummy.rotation.set(-.35, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(k++, dummy.matrix); }
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(inst);
  const pitchX = 5, pitchZ = 7;
  for (let i = 0; i < Math.min(spec.units, 12); i++) g.add(box(6, 3, 3, MAT.white, (i - spec.units / 2) * 14, 0, rows / 2 * pitchZ + 14));
  g.add(box(30, 6, 12, MAT.dark, 0, 0, rows / 2 * pitchZ + 30));
  return { group: g, cameraDistance: Math.max(cols * pitchX, rows * pitchZ) * .9 + 60, update: (st) => {
    // single-axis tracking: tilt panels toward the sun azimuth (east-west)
    const el = st.sun ? st.sun.elevation : 0, az = st.sun ? st.sun.azimuth : 180;
    const tilt = el > 0 ? Math.max(-1, Math.min(1, -Math.cos(az * Math.PI / 180) * (1 - el / 90))) * .9 : 0;
    let k2 = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { dummy.position.set((c - cols / 2) * pitchX, 2, (r - rows / 2) * pitchZ); dummy.rotation.set(-.2, 0, tilt); dummy.updateMatrix(); inst.setMatrixAt(k2++, dummy.matrix); }
    inst.instanceMatrix.needsUpdate = true;
  } };
}
function buildTower(spec) {
  const g = new THREE.Group();
  const towerH = spec.towerH || 200;
  const tower = cyl(4, 6, towerH, MAT.white, 0, 0, 0); g.add(tower);
  const recv = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 18, 24), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a00, emissiveIntensity: .2 })); recv.position.y = towerH + 9; g.add(recv);
  const light = new THREE.PointLight(0xffaa55, 0, 400); light.position.y = towerH + 9; g.add(light);
  const count = Math.min(4000, Math.max(600, Math.round(spec.capacityMw * 25)));
  const geo = new THREE.BoxGeometry(6, .2, 5);
  const inst = new THREE.InstancedMesh(geo, MAT.mirror, count);
  const positions = [];
  let placed = 0, ring = 0;
  while (placed < count) { const r = 40 + ring * 9; const n = Math.floor(2 * Math.PI * r / 8); for (let i = 0; i < n && placed < count; i++) { const a = i / n * Math.PI * 2 + (ring % 2) * .1; positions.push(new THREE.Vector3(Math.cos(a) * r, 2.5, Math.sin(a) * r)); placed++; } ring++; }
  const dummy = new THREE.Object3D();
  g.add(inst);
  g.add(cyl(9, 9, 14, MAT.white, 40, 0, 40), cyl(9, 9, 14, MAT.red, 62, 0, 40)); // cold & hot salt tanks
  g.add(box(30, 12, 18, MAT.blue, 52, 0, 70)); // power block
  g.add(box(8, 5, 6, MAT.orange, 74, 0, 70));
  const target = new THREE.Vector3(0, towerH + 9, 0);
  return { group: g, cameraDistance: 40 + ring * 9 + 160, update: (st) => {
    const el = st.sun ? st.sun.elevation : -10, az = st.sun ? st.sun.azimuth : 0;
    const sunDir = new THREE.Vector3(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180), -Math.cos(az * Math.PI / 180) * Math.cos(el * Math.PI / 180));
    const active = el > 3 && st.dni > 50;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]; dummy.position.copy(p);
      if (active) { const toT = target.clone().sub(p).normalize(); const nrm = sunDir.clone().add(toT).normalize(); dummy.lookAt(p.clone().add(nrm)); dummy.rotateX(Math.PI / 2); }
      else dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    const inten = active ? Math.min(1, st.fieldMwth / (spec.capacityMw * 3)) : 0;
    recv.material.emissiveIntensity = .1 + inten * 2.5; light.intensity = inten * 3000;
  } };
}
function buildTrough(spec) {
  const g = new THREE.Group();
  const loops = Math.min(60, Math.max(8, Math.round(spec.capacityMw / 3)));
  const cols = Math.ceil(Math.sqrt(loops)), rows = Math.ceil(loops / cols);
  const shape = new THREE.Shape(); shape.moveTo(-3, 1.2); shape.quadraticCurveTo(0, -1.2, 3, 1.2); shape.lineTo(3, 1.4); shape.quadraticCurveTo(0, -1, -3, 1.4); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 60, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-30, 0, 0);
  const inst = new THREE.InstancedMesh(geo, MAT.mirror, loops * 2);
  const dummy = new THREE.Object3D(); const pos = [];
  for (let i = 0; i < loops; i++) { const c = i % cols, r = Math.floor(i / cols); for (let s = 0; s < 2; s++) pos.push(new THREE.Vector3((c - cols / 2) * 70 + (s ? 34 : -34), 3, (r - rows / 2) * 14)); }
  g.add(inst);
  const pbX = cols / 2 * 70 + 40;
  g.add(box(30, 12, 18, MAT.blue, pbX, 0, 0), cyl(8, 8, 12, MAT.white, pbX, 0, 30), cyl(8, 8, 12, MAT.red, pbX, 0, 52), box(8, 5, 6, MAT.orange, pbX + 24, 0, 0));
  g.add(box(26, 8, 40, MAT.dark, pbX, 0, -40)); // air-cooled condenser
  return { group: g, cameraDistance: Math.max(cols * 70, rows * 14) * .8 + 120, update: (st) => {
    const el = st.sun ? st.sun.elevation : 0, az = st.sun ? st.sun.azimuth : 180;
    const rot = el > 0 ? Math.atan2(Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180), Math.sin(el * Math.PI / 180)) : Math.PI / 2;
    for (let i = 0; i < pos.length; i++) { dummy.position.copy(pos[i]); dummy.rotation.set(rot * .9, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); }
    inst.instanceMatrix.needsUpdate = true;
  } };
}
function buildWind(spec) {
  const g = new THREE.Group(); const rotors = [];
  const n = Math.min(spec.units, 60), cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
  const hub = Math.min(120, 60 + spec.unitMw * 12), bladeL = hub * .6;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const t = new THREE.Group(); t.position.set((c - cols / 2) * bladeL * 5, 0, (r - rows / 2) * bladeL * 7);
    t.add(cyl(1.6, 2.6, hub, MAT.white, 0, 0, 0, 12));
    const nac = box(6, 3.5, 3.5, MAT.white, 0, hub - 1.75, 0); t.add(nac);
    const rotor = new THREE.Group(); rotor.position.set(0, hub, 3.2);
    for (let b = 0; b < 3; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, bladeL, .35), MAT.white); blade.position.y = bladeL / 2; const pivot = new THREE.Group(); pivot.rotation.z = b * Math.PI * 2 / 3; pivot.add(blade); rotor.add(pivot); }
    t.add(rotor); rotors.push({ rotor, t, phase: Math.random() * 6 });
    g.add(t);
  }
  g.add(box(30, 5, 12, MAT.dark, 0, 0, rows / 2 * bladeL * 7 + 40));
  return { group: g, cameraDistance: Math.max(cols * bladeL * 5, rows * bladeL * 7) * .7 + hub * 2, update: (st, dt) => {
    const rpm = st.rotorRpm || 0;
    for (const r of rotors) { r.rotor.rotation.z += rpm / 60 * Math.PI * 2 * dt; }
  } };
}
function buildHydro(spec, hero) {
  const g = new THREE.Group();
  const n = Math.min(spec.units, 12);
  const damW = Math.max(160, n * 26 + 80), damH = hero === 'aswan-high-dam' ? 110 : 70;
  const dam = new THREE.Mesh(new THREE.BoxGeometry(damW, damH, 40), MAT.concrete); dam.position.set(0, damH / 2, 0); dam.rotation.x = -.12; g.add(dam);
  const water = new THREE.Mesh(new THREE.BoxGeometry(damW + 300, 1, 300), MAT.water); water.position.set(0, damH * .85, -170); g.add(water);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(damW + 100, 1, 200), MAT.water); tail.position.set(0, 4, 160); g.add(tail);
  const ph = box(n * 26 + 20, 22, 30, MAT.blue, 0, 0, 40); g.add(ph); // powerhouse
  for (let i = 0; i < n; i++) { const p = cyl(3.5, 3.5, 60, MAT.steel, (i - (n - 1) / 2) * 26, 0, 0, 12); p.rotation.x = Math.PI / 2 - .55; p.position.set((i - (n - 1) / 2) * 26, 28, 12); g.add(p); }
  const spill = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 80), new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: .8 })); spill.position.set(damW / 2 - 40, 20, 40); spill.rotation.x = .35; g.add(spill);
  for (let i = 0; i < 4; i++) g.add(cyl(.5, .8, 34, MAT.steel, -damW / 2 + 30 + i * 40, 0, 90, 6));
  const lb = makeLabel(spec.label); lb.position.set(0, damH + 30, 0); g.add(lb);
  return { group: g, cameraDistance: damW * 1.1 + 120, update: (st) => { water.position.y = damH * (.55 + .32 * st.reservoirLevel); spill.visible = st.reservoirLevel > .98; } };
}
function buildDiesel(spec) {
  const g = new THREE.Group(); const plumes = [];
  const n = Math.min(spec.units, 16), cols = 8, pitch = 14;
  g.add(box(cols * pitch + 10, 10, 30, MAT.steel, 0, 0, 0));
  for (let i = 0; i < n; i++) { const x = ((i % cols) - (cols - 1) / 2) * pitch, z = i < cols ? -20 : 24; const s = cyl(.8, .9, 20, MAT.dark, x, 10, z); g.add(s); const p = makePlume(0x999999, 15); p.position.set(x, 30, z); g.add(p); plumes.push(p); g.add(box(8, 3, 4, MAT.white, x, 10, z + (i < cols ? -6 : 6))); }
  g.add(cyl(10, 10, 12, MAT.white, -70, 0, 40), cyl(10, 10, 12, MAT.white, -44, 0, 40));
  g.add(box(24, 5, 10, MAT.dark, 60, 0, 40));
  return { group: g, cameraDistance: 200, update: (st, dt, windDir) => plumes.forEach((p, i) => { const u = st.units[i]; p.userData.update(dt, u ? u.output / u.capacityMw * .6 : 0, windDir); }) };
}

export function composeScene(plant, techCode, units, unitMw) {
  const spec = { units, unitMw, capacityMw: plant.capacityMw, label: plant.name, unitLabel: i => `${plant.name.split(' ')[0]} U${i + 1}` };
  const hero = plant.hero;
  const parts = [];
  const add = (b, x = 0, z = 0) => { b.group.position.set(x, 0, z); parts.push(b); };
  if (hero === 'noor-ouarzazate' || (plant.complex === 'noor-ouarzazate')) {
    add(buildTrough({ ...spec, capacityMw: 160 }), -520, 200); add(buildTrough({ ...spec, capacityMw: 200 }), -520, -400);
    add(buildTower({ ...spec, capacityMw: 150, towerH: 243 }), 350, 0); add(buildPV({ ...spec, capacityMw: 72, units: 4 }), 350, 600);
  } else if (hero === 'mbr-solar-park' || plant.complex === 'mbr-solar-park') {
    add(buildTower({ ...spec, capacityMw: 100, towerH: 262 }), 0, -150); add(buildTrough({ ...spec, capacityMw: 200 }), -600, 300); add(buildPV({ ...spec, capacityMw: 250, units: 8 }), 500, 500);
  } else {
    switch (techCode) {
      case 'ccgt': case 'igcc': add(buildCombinedCycle(spec)); break;
      case 'ocgt': add(buildOpenCycle(spec)); break;
      case 'steam_oil': case 'oil_shale': case 'biomass': case 'waste_to_energy': add(buildSteam(spec, techCode === 'oil_shale')); break;
      case 'coal_steam': add(buildSteam(spec, true)); break;
      case 'nuclear_pwr': add(buildNuclear(spec)); break;
      case 'pv': add(buildPV(spec)); break;
      case 'csp_tower': add(buildTower({ ...spec, towerH: plant.id === 'gppd-WRI1061198' ? 243 : 200 })); break;
      case 'csp_trough': add(buildTrough(spec)); break;
      case 'wind_onshore': add(buildWind(spec)); break;
      case 'hydro_dam': case 'hydro_ror': add(buildHydro(spec, hero)); break;
      case 'diesel': add(buildDiesel(spec)); break;
      default: add(buildCombinedCycle(spec));
    }
  }
  const group = new THREE.Group();
  for (const p of parts) group.add(p.group);
  const cameraDistance = parts.length > 1 ? 1100 : parts[0].cameraDistance;
  return { group, cameraDistance, update: (st, dt, windDir) => parts.forEach(p => p.update(st, dt, windDir)) };
}

export class TwinScene {
  constructor(canvas, plant, techCode, sim) {
    this.canvas = canvas; this.plant = plant; this.sim = sim;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x9fb8c9, 900, 4000);
    this.camera = new THREE.PerspectiveCamera(50, 1, 1, 8000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI / 2 - .03; this.controls.minDistance = 30; this.controls.maxDistance = 3500;
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2); this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xbfd7ee, 0x8a7a55, 1.1); this.scene.add(this.hemi);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 64), MAT.sand); ground.rotation.x = -Math.PI / 2; ground.position.y = -.5; this.scene.add(ground);
    const grid = new THREE.GridHelper(2000, 40, 0x8c7a55, 0xb39c6e); grid.position.y = 0; grid.material.opacity = .25; grid.material.transparent = true; this.scene.add(grid);
    this.model = composeScene(plant, techCode, sim.units.length, sim.unitMw);
    this.scene.add(this.model.group);
    const d = this.model.cameraDistance;
    this.camera.position.set(d * .7, d * .45, d * .8); this.controls.target.set(0, 20, 0);
    this.autoOrbit = false; this.lastT = performance.now();
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || 800, hgt = this.canvas.clientHeight || 500;
    this.renderer.setSize(w, hgt, false); this.camera.aspect = w / hgt; this.camera.updateProjectionMatrix();
  }
  frame(simDt) {
    const now = performance.now(); const dt = Math.min(.1, (now - this.lastT) / 1000); this.lastT = now;
    const st = this.sim.state;
    const el = st.sun ? st.sun.elevation : 30, az = st.sun ? st.sun.azimuth : 180;
    const e = Math.max(-10, el) * Math.PI / 180, a = az * Math.PI / 180;
    this.sun.position.set(Math.sin(a) * Math.cos(e) * 1000, Math.sin(e) * 1000 + 50, -Math.cos(a) * Math.cos(e) * 1000);
    const day = Math.max(0, Math.min(1, (el + 6) / 20));
    this.sun.intensity = 0.2 + 2.2 * day * (1 - 0.6 * this.sim.env.cloud) * (1 - 0.5 * this.sim.env.dust);
    this.hemi.intensity = 0.25 + 0.9 * day;
    const sky = new THREE.Color().lerpColors(new THREE.Color(0x0b1626), new THREE.Color(0x9fc4e6), day).lerp(new THREE.Color(0xc9b184), this.sim.env.dust * .7);
    this.scene.background = sky; this.scene.fog.color = sky;
    if (this.autoOrbit) { const r = Math.hypot(this.camera.position.x, this.camera.position.z); const ang = Math.atan2(this.camera.position.z, this.camera.position.x) + dt * .08; this.camera.position.x = Math.cos(ang) * r; this.camera.position.z = Math.sin(ang) * r; }
    this.model.update({ ...st, units: this.sim.units }, Math.max(dt, simDt || dt), 1);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.controls.dispose(); this.renderer.dispose(); this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
