// Environment: physical sky, sun/hemisphere lighting with shadows, terrain (biome + relief), sea, and day/night tint.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { M, antiTile } from './materials.js';
import { seeded, D2R } from './primitives.js';

/** Sun direction for elevation/azimuth in degrees (azimuth clockwise from north; north = -z, east = +x). */
export function sunDirection(elev, azim) { const e = elev * D2R, a = azim * D2R; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); }

export function makeSky() {
  const sky = new Sky(); sky.scale.setScalar(40000);
  const u = sky.material.uniforms; u.turbidity.value = 4; u.rayleigh.value = 1.6; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .85;
  return sky;
}
/** Adjusts the sky shader for dust/haze and the sun position. */
export function setSky(sky, sunDir, dust = 0, cloud = 0) {
  const u = sky.material.uniforms;
  u.sunPosition.value.copy(sunDir);
  u.turbidity.value = 1.8 + dust * 12 + cloud * 5;
  u.rayleigh.value = 1.3 + cloud * .8;
  u.mieCoefficient.value = .0015 + dust * .03;
  u.mieDirectionalG.value = .8;
}

function valueNoise(seed) {
  const rand = seeded(seed); const grid = 256; const vals = new Float32Array(grid * grid); for (let i = 0; i < vals.length; i++) vals[i] = rand();
  const at = (x, y) => vals[((y & (grid - 1)) * grid + (x & (grid - 1)))];
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), tx = sm(x - xi), ty = sm(y - yi); const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty; };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Terrain disc: flat inside `flatR`, gentle relief outside, hills towards the horizon (never on the sea side).
 * opts: { biome: 'desert'|'scrub'|'green', flatR, size, seaDir (Vector3 or null), shore (distance to shoreline), relief (0..2), seed, valley }
 */
export function makeTerrain(opts = {}) {
  const { biome = 'desert', flatR = 400, size = 9000, seaDir = null, shore = 300, relief = 1, seed = 7, valley = null, river = null } = opts;
  const seg = 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const noise = valueNoise(seed), noise2 = valueNoise(seed + 11);
  const pos = geo.attributes.position; const uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3); const noise3 = valueNoise(seed + 23);
  const tile = (M[biome === 'green' ? 'grass' : biome === 'scrub' ? 'scrub' : 'sand'].userData.tile) || 14;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const r = Math.hypot(x, z);
    let y = 0;
    const outside = smooth(flatR, flatR * 1.7, r);
    const n = noise(x / 380 + 50, z / 380 + 50) - .5, n2 = noise2(x / 190 + 9, z / 190 + 9) - .5;
    y += outside * (n * 16 + n2 * 5) * relief;
    const far = smooth(2200, 4200, r); y += far * Math.max(0, noise(x / 900 + 3, z / 900 + 3) - .35) * 900 * relief; // hills on the horizon
    if (valley) { // hydro sites: steep valley walls either side of the river axis (valley.dir = unit vector along the river)
      const across = Math.abs(x * -valley.dir.z + z * valley.dir.x); const wall = smooth(valley.halfWidth, valley.halfWidth + 260, across);
      y += wall * (valley.height + (noise(x / 300, z / 300) - .5) * valley.height * .5);
    }
    if (river) { const across = Math.abs(x * -river.dir.z + z * river.dir.x); y -= river.depth * (1 - smooth(river.halfWidth, river.halfWidth + 50, across)); }
    if (seaDir) { const along = x * seaDir.x + z * seaDir.z; const s = smooth(shore - 120, shore + 40, along); y = y * (1 - s) - 6 * s; y -= smooth(shore, shore + 900, along) * 20; }
    pos.setY(i, y);
    uv.setXY(i, (x + size / 2) / tile, (z + size / 2) / tile);
    const shade = .72 + .5 * noise3(x / 520 + 7, z / 520 + 7) + .16 * (noise2(x / 140, z / 140) - .5); colors[i * 3] = shade; colors[i * 3 + 1] = shade; colors[i * 3 + 2] = shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = antiTile(M[biome === 'green' ? 'grass' : biome === 'scrub' ? 'scrub' : 'sand'].clone()); mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true; mesh.position.y = -.05; mesh.name = 'terrain';
  return mesh;
}
/** Sea plane that starts at `shore` metres along `seaDir` and extends to the horizon. */
export function makeSea(seaDir, shore = 300, size = 12000) {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1); geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * size / 30, uv.getY(i) * size / 30);
  const mesh = new THREE.Mesh(geo, M.water); mesh.receiveShadow = true; mesh.name = 'sea'; mesh.userData.dynamic = true;
  const along = shore - 60 + size / 2; mesh.position.set(seaDir.x * along, -.6, seaDir.z * along); mesh.rotation.y = Math.atan2(-seaDir.x, -seaDir.z);
  return mesh;
}
export function makeLights(scene) {
  const sun = new THREE.DirectionalLight(0xfff2dc, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = .8; sun.shadow.camera.near = 10; sun.shadow.camera.far = 5000;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe3f5, 0x8f7a58, 1.2); scene.add(hemi);
  const fill = new THREE.AmbientLight(0xffffff, .15); scene.add(fill);
  return { sun, hemi, fill };
}
/** Sets the shadow camera box to the plant footprint (radius r). */
export function fitShadow(sun, r) { const c = sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.updateProjectionMatrix(); }
/** Biome from geography: green for river valleys / tropical south, scrub for the Mediterranean and highlands, desert elsewhere. */
export function biomeFor(plant) {
  const lat = plant.lat ?? 25, lon = plant.lon ?? 45, tech = plant.technology || '';
  if (tech.startsWith('hydro')) return plant.country === 'EGY' ? 'desert' : ['SDN', 'SAU', 'YEM', 'OMN', 'JOR'].includes(plant.country) ? 'scrub' : 'green';
  if (['COM', 'SOM'].includes(plant.country) || lat < 14) return 'green';
  if (['LBN', 'SYR', 'TUN', 'MAR', 'DZA', 'PSE', 'JOR'].includes(plant.country) && lat > 31) return 'scrub';
  if (plant.country === 'EGY' && lon > 30 && lon < 32.6 && lat > 24 && lat < 31.5) return 'scrub'; // Nile valley / Delta
  if (plant.country === 'IRQ' && lat > 30 && lon > 43) return 'scrub';
  if (['YEM', 'OMN'].includes(plant.country) && lat < 18 && lon > 43 && lon < 55) return 'scrub';
  return 'desert';
}
