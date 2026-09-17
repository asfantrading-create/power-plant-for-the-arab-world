// 3D digital-twin scenes: technology layouts + landmark ("hero") plants composed on a site with sky, terrain and sea.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { M, setNight } from './lib/materials.js';
import * as P from './lib/primitives.js';
import * as C from './lib/components.js';
import * as B from './lib/builders.js';
import { makeSky, setSky, sunDirection, makeTerrain, makeSea, makeLights, fitShadow, biomeFor } from './lib/env.js';
import { box, slab, group, at } from './lib/primitives.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function buildTech(plant, techCode, spec) {
  switch (techCode) {
    case 'ccgt': case 'igcc': return B.buildCombinedCycle(plant, spec, {});
    case 'ocgt': return B.buildOpenCycle(plant, spec);
    case 'steam_oil': case 'biomass': case 'waste_to_energy': return B.buildSteam(plant, spec, {});
    case 'oil_shale': return B.buildSteam(plant, spec, { coal: true });
    case 'coal_steam': return B.buildSteam(plant, spec, { coal: true, jetty: plant.coastal });
    case 'nuclear_pwr': return B.buildNuclear(plant, spec);
    case 'pv': return B.buildPV(plant, spec, { density: plant.hero === 'pv-park' ? 7 : 9 });
    case 'csp_tower': return B.buildTower(plant, spec, { towerH: plant.id === 'gppd-WRI1061198' ? 243 : undefined });
    case 'csp_trough': return B.buildTrough(plant, spec, { boosters: plant.hero === 'csp-trough' });
    case 'wind_onshore': return B.buildWind(plant, spec);
    case 'hydro_dam': return B.buildHydroDam(plant, spec, plant.hero === 'aswan-high-dam' ? { embankment: true, damH: 111, damW: 1500, monument: true, phX: 520 } : {});
    case 'hydro_ror': return B.buildRunOfRiver(plant, spec);
    case 'diesel': return B.buildDiesel(plant, spec);
    default: return B.buildCombinedCycle(plant, spec, {});
  }
}
/** Axis-aligned footprint of a group (objects flagged noFootprint, e.g. reservoirs, are ignored). */
function footprintOf(g) {
  g.updateMatrixWorld(true);
  const b = new THREE.Box3(); const tmp = new THREE.Box3();
  g.traverse(o => { if (o.userData.noFootprint || !(o.isMesh || o.isInstancedMesh)) return; tmp.setFromObject(o); if (!tmp.isEmpty()) b.union(tmp); });
  if (b.isEmpty()) b.set(new THREE.Vector3(-100, 0, -100), new THREE.Vector3(100, 10, 100));
  return { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, maxY: b.max.y };
}
/** Fence, gate, administration, parking, access road, lamps, palms and the outgoing transmission line. */
function addSite(root, tech, fp, opts) {
  const margin = 24, cx = opts.roadX ?? (fp.minX + fp.maxX) / 2;
  const zGate = fp.maxZ + margin + 78, zMin = fp.minZ - margin, W = fp.maxX - fp.minX + margin * 2, D = zGate - zMin, cz = (zMin + zGate) / 2;
  if (!opts.noFence) {
    root.add(at(C.fence(W, D), cx, 0, cz)); root.add(slab(W, D, M.sitePad, cx, .015, cz, { thick: .05 }));
    for (const [x, z, w, d] of [[cx, zMin + 8, W - 16, 7], [cx, zGate - 8, W - 16, 7], [cx - W / 2 + 8, cz, 7, D - 16], [cx + W / 2 - 8, cz, 7, D - 16]]) root.add(slab(w, d, M.asphalt, x, .03, z, { tile: [7, 8] })); // perimeter road
  }
  opts.rect = { W, D };
  if (!opts.noAdmin) {
    root.add(at(C.building(38, 11, 18), cx - 58, 0, zGate - 44), at(C.building(12, 4, 8, { mat: M.officeDark, canopy: false }), cx + 16, 0, zGate - 9));
    root.add(slab(46, 26, M.asphalt, cx + 46, .03, zGate - 40, { tile: [46, 8] }));
    for (let i = 0; i < 6; i++) root.add(box(4.2, 1.5, 2, i % 2 ? M.white : M.steelDark, cx + 30 + i * 6, .05, zGate - 34, { cast: true })); // parked cars
    root.add(box(.6, 3.6, .6, M.steelGalv, cx - 7, 0, zGate), box(.6, 3.6, .6, M.steelGalv, cx + 7, 0, zGate), box(12, .18, .18, M.steelRed, cx, 1.1, zGate + 1.5));
    root.add(slab(9, zGate - fp.maxZ + 10, M.asphalt, cx, .04, (zGate + fp.maxZ) / 2, { tile: [9, 8] }));
    for (let i = 0; i < 4; i++) root.add(at(C.lampPost(9), cx + 7, 0, fp.maxZ + 10 + i * 34));
  }
  root.add(slab(9, 3200, M.asphalt, cx, .04, zGate + 1600, { tile: [9, 8] }));
  if (!opts.noAdmin) for (let i = 0; i < 8; i++) root.add(at(C.lampPost(10), cx - 7, 0, zGate + 20 + i * 55));
  if (opts.palms && !opts.noAdmin) { const rand = P.seeded(5); for (let i = 0; i < 12; i++) root.add(at(C.palm(7 + rand() * 4, rand), cx + (i % 2 ? 9 : -9) + (rand() - .5) * 2, 0, zGate + 6 + i * 11)); }
  if (tech.userData.lineFrom) { const from = tech.userData.lineFrom.clone().addScaledVector(tech.userData.lineDir, 70); root.add(C.transmissionLine(from, tech.userData.lineDir, 6, 280, 40)); }
}

/**
 * Builds the plant. Returns { group, cameraDistance, update(state, dt, wind), site }.
 * `site` describes the world around the plant: coastline, biome, footprint radius and the default view direction.
 */
export function composeScene(plant, techCode, units, unitMw) {
  const spec = { units, unitMw, capacityMw: plant.capacityMw, label: plant.name, unitLabel: i => `U${i + 1}` };
  const parts = []; const root = new THREE.Group(); root.name = 'plant';
  const complexSolar = plant.complex === 'noor-ouarzazate' || plant.hero === 'noor-ouarzazate' ? 'noor' : plant.complex === 'mbr-solar-park' || plant.hero === 'mbr-solar-park' ? 'mbr' : null;
  let noFence = false, noAdmin = false;
  const add = (b, x = 0, z = 0) => { b.group.position.set(x, 0, z); root.add(b.group); parts.push(b); return b; };
  if (complexSolar === 'noor') {
    add(B.buildTrough(plant, { ...spec, capacityMw: 160, units: 1 }), -1050, 650); add(B.buildTrough(plant, { ...spec, capacityMw: 200, units: 1 }), -1050, -800);
    add(B.buildTower(plant, { ...spec, capacityMw: 150, units: 1 }, { towerH: 243 }), 500, -300); add(B.buildPV(plant, { ...spec, capacityMw: 72, units: 4 }), 550, 850);
    noFence = true; noAdmin = true;
  } else if (complexSolar === 'mbr') {
    add(B.buildTower(plant, { ...spec, capacityMw: 100, units: 1 }, { towerH: 262 }), 200, -1200);
    for (let i = 0; i < 3; i++) add(B.buildTrough(plant, { ...spec, capacityMw: 200, units: 1 }), -1300 + i * 1350, 300);
    add(B.buildPV(plant, { ...spec, capacityMw: 250, units: 8 }), 1500, -1200);
    noFence = true; noAdmin = true;
  } else {
    add(buildTech(plant, techCode, spec));
    noFence = techCode.startsWith('hydro') || techCode === 'wind_onshore'; noAdmin = techCode.startsWith('hydro');
  }
  const fp = footprintOf(root);
  const biome = biomeFor(plant);
  addSite(root, parts[0].group, fp, { noFence, noAdmin, palms: plant.coastal || biome === 'green', roadX: techCode.startsWith('hydro') ? fp.maxX + 40 : undefined });
  const w = fp.maxX - fp.minX + 60, d = fp.maxZ - fp.minZ + 160;
  const footprintR = Math.hypot(w, d) * .5 + 60;
  const bearing = plant.coastal ? (plant.seaBearing ?? 0) : 0;
  const baked = P.bake(root);
  const world = new THREE.Group(); world.name = 'world'; world.add(baked); world.rotation.y = -bearing * D2R;
  const seaDir = plant.coastal ? new THREE.Vector3(Math.sin(bearing * D2R), 0, -Math.cos(bearing * D2R)) : null;
  const shore = plant.coastal ? -fp.minZ + (['ccgt', 'steam_oil', 'coal_steam', 'nuclear_pwr', 'oil_shale', 'igcc'].includes(techCode) ? 24 : 160) : 0;
  const view = plant.coastal ? new THREE.Vector3(-seaDir.x, 0, -seaDir.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), .45) : new THREE.Vector3(.55, 0, .83).normalize();
  const valley = parts[0].group.userData.valley || null, river = parts[0].group.userData.river || null;
  const lamps = []; world.traverse(o => { if (o.isSprite && (o.userData.lamp || o.userData.beacon)) lamps.push(o); });
  const cameraDistance = Math.max(w, d) * (parts.length > 1 ? .7 : techCode === 'wind_onshore' ? .5 : .8) + 120;
  const update = (st, dt, wind) => {
    const wv = typeof wind === 'number' ? { x: wind * .5, z: .6 } : (wind || { x: .4, z: .7 });
    for (const p of parts) for (const u of p.updaters) u(st, dt, wv);
  };
  return { group: world, cameraDistance, update, lamps, site: { coastal: !!plant.coastal, seaDir, shore, biome, footprintR, view, valley, river, targetY: clamp(fp.maxY * .18, 6, 40) } };
}

export class TwinScene {
  constructor(canvas, plant, techCode, sim) {
    this.canvas = canvas; this.plant = plant; this.sim = sim;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .6;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.scene.environmentIntensity = .4;
    this.camera = new THREE.PerspectiveCamera(46, 1, 1, 40000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI / 2 - .02; this.controls.minDistance = 15; this.controls.maxDistance = 8000;
    this.model = composeScene(plant, techCode, sim.units.length, sim.unitMw);
    const site = this.site = this.model.site;
    this.scene.add(this.model.group);
    this.sky = makeSky(); this.scene.add(this.sky); this.skyScene = new THREE.Scene(); this.pmrem = new THREE.PMREMGenerator(this.renderer); this.envRT = null; this.envKey = null;
    this.lights = makeLights(this.scene); fitShadow(this.lights.sun, site.footprintR * 1.15);
    this.terrain = makeTerrain({ biome: site.biome, size: Math.max(9000, site.footprintR * 5), flatR: site.footprintR * 1.05, seaDir: site.seaDir, shore: site.shore, seed: (plant.lat || 0) * 100 | 0, valley: site.valley, river: site.river, relief: site.valley ? 2 : site.biome === 'desert' ? .7 : 1.2 });
    this.scene.add(this.terrain);
    if (site.coastal) { this.sea = makeSea(site.seaDir, site.shore); this.scene.add(this.sea); }
    if (site.river) { const r = slab(site.river.halfWidth * 2, 6000, M.waterLake, 0, 2.5, 0, { thick: 1 }); r.receiveShadow = true; this.scene.add(r); }
    const fogNear = Math.min(site.footprintR * 2.5 + 900, 7000); this.scene.fog = new THREE.Fog(0xcfd8e0, fogNear, Math.max(fogNear + 6000, 14000));
    { const n = 1400, pts = new Float32Array(n * 3), rand = P.seeded(3); for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2, e = Math.asin(rand() * .95 + .05); pts[i * 3] = Math.cos(a) * Math.cos(e) * 18000; pts[i * 3 + 1] = Math.sin(e) * 18000; pts[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 18000; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3)); this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 40, transparent: true, opacity: 0, fog: false, depthWrite: false })); this.scene.add(this.stars); }
    const d = this.model.cameraDistance; const az0 = (sim.state.sun ? sim.state.sun.azimuth : 150) + 75; const v = new THREE.Vector3(Math.sin(az0 * D2R), 0, -Math.cos(az0 * D2R)); // three-quarter lighting: sun 75° to the side of the camera
    const hF = techCode === 'wind_onshore' ? .2 : techCode.startsWith('hydro') ? .28 : .33;
    this.camera.position.set(v.x * d * .95, d * hF, v.z * d * .95); this.controls.target.set(0, site.targetY, 0);
    this.autoOrbit = false; this.lastT = performance.now(); this.t = 0;
    this.scene.traverse(o => { if (o.material && o.material.map) o.material.map.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); });
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || 800, hgt = this.canvas.clientHeight || 500;
    this.renderer.setSize(w, hgt, false); this.camera.aspect = w / hgt; this.camera.updateProjectionMatrix();
  }
  updateEnvironment(sunDir, elev, dust, cloud) {
    setSky(this.sky, sunDir, dust, cloud);
    const key = `${Math.round(elev / 4)}|${Math.round(dust * 5)}|${Math.round(cloud * 4)}`;
    if (key === this.envKey) return; this.envKey = key;
    if (this.envRT) this.envRT.dispose();
    this.skyScene.add(this.sky); this.envRT = this.pmrem.fromScene(this.skyScene); this.scene.add(this.sky);
    this.scene.environment = this.envRT.texture;
  }
  frame(simDt) {
    const now = performance.now(); const dt = Math.min(.1, (now - this.lastT) / 1000); this.lastT = now; this.t += dt;
    const st = this.sim.state, env = this.sim.env;
    const elev = st.sun ? st.sun.elevation : 35, az = st.sun ? st.sun.azimuth : 180;
    const sunDir = sunDirection(Math.max(-8, elev), az);
    const day = smooth(-5, 12, elev), night = 1 - day, dust = env.dust || 0, cloud = env.cloud || 0;
    const sun = this.lights.sun; sun.position.copy(sunDir).multiplyScalar(1600); sun.target.position.set(0, 0, 0);
    sun.intensity = 3.1 * day * (1 - .65 * cloud) * (1 - .35 * dust);
    sun.color.setHex(0xffb06a).lerp(new THREE.Color(0xfff4e2), smooth(0, 28, elev));
    this.lights.hemi.intensity = .75 + .2 * day * (1 - .3 * cloud); this.lights.hemi.color.setHex(0x5b6f96).lerp(new THREE.Color(0xd2e4f5), day);
    this.lights.fill.intensity = .03 + .05 * day;
    this.renderer.toneMappingExposure = .5 + .14 * day;
    this.stars.material.opacity = night * .9;
    this.updateEnvironment(sunDir, elev, dust, cloud);
    const horizon = new THREE.Color(0xc9d6e2).lerp(new THREE.Color(0xd9c49c), dust * .8).lerp(new THREE.Color(0xaeb9c4), cloud * .6);
    this.scene.fog.color.copy(new THREE.Color(0x121e33).lerp(horizon, day));
    setNight(night);
    for (const l of this.model.lamps) l.material.opacity = l.userData.beacon ? night * (.55 + .45 * Math.sin(this.t * 3.5)) : night;
    M.water.normalMap.offset.set(this.t * .012, this.t * .008); M.waterLake.normalMap.offset.set(this.t * .006, -this.t * .004);
    if (this.autoOrbit) { const r = Math.hypot(this.camera.position.x, this.camera.position.z); const ang = Math.atan2(this.camera.position.z, this.camera.position.x) + dt * .07; this.camera.position.x = Math.cos(ang) * r; this.camera.position.z = Math.sin(ang) * r; }
    const wind = { x: .35 + (env.windMs || 8) / 30, z: .55 };
    this.model.update({ ...st, units: this.sim.units }, Math.max(dt, simDt || dt), wind);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.controls.dispose(); if (this.envRT) this.envRT.dispose(); this.pmrem.dispose(); this.renderer.dispose(); this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
