// Geometry helpers: metre-tiled boxes/cylinders, tubes, instancing, static-geometry baking, labels and plumes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

export const D2R = Math.PI / 180;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const tileOf = (mat, o) => { const t = o.tile ?? (mat && mat.userData ? mat.userData.tile : null); if (!t) return null; return Array.isArray(t) ? t : [t, t]; };
function scaleUvRange(geo, start, count, su, sv) { const uv = geo.attributes.uv; for (let i = start; i < start + count; i++) { uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); } uv.needsUpdate = true; }

/** Box with its base at y (not centred): the natural way to place buildings. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, o = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const t = tileOf(mat, o);
  if (t) { const [tu, tv] = t; scaleUvRange(geo, 0, 8, d / tu, h / tv); scaleUvRange(geo, 8, 8, w / tu, d / tv); scaleUvRange(geo, 16, 8, w / tu, h / tv); }
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  if (o.rotY) m.rotation.y = o.rotY;
  return m;
}
/** Cylinder standing on y (base at y). */
export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24, o = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, seg, 1, o.open ?? false);
  const t = tileOf(mat, o);
  if (t) { const [tu, tv] = t; scaleUvRange(geo, 0, geo.attributes.uv.count, (Math.PI * (rt + rb)) / tu, (o.vRepeat ?? h / tv)); }
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  return m;
}
/** Horizontal slab (thin box) with its top at y: pads, roads, water. */
export function slab(w, d, mat, x = 0, y = 0, z = 0, o = {}) { const m = box(w, o.thick ?? .3, d, mat, x, y - (o.thick ?? .3), z, { ...o, cast: o.cast ?? false }); return m; }
export function lathe(points, mat, seg = 32, o = {}) {
  const geo = new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg);
  const t = tileOf(mat, o); if (t) { const maxR = Math.max(...points.map(p => p[0])), hgt = Math.max(...points.map(p => p[1])); scaleUvRange(geo, 0, geo.attributes.uv.count, 2 * Math.PI * maxR / t[0], hgt / t[1]); }
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
export function sphere(r, mat, x = 0, y = 0, z = 0, o = {}) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg ?? 24, o.rings ?? 16, 0, Math.PI * 2, 0, o.half ? Math.PI / 2 : Math.PI), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
/** Pipe along a polyline (Catmull-Rom smoothed; `sharp` keeps the corners). */
export function tube(points, r, mat, o = {}) {
  const pts = points.map(p => Array.isArray(p) ? V(p[0], p[1], p[2]) : p);
  const curve = o.sharp === false ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.CurvePath();
  if (o.sharp !== false) for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  const geo = new THREE.TubeGeometry(curve, o.segments ?? Math.max(8, pts.length * 6), r, o.radial ?? 10, false);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
export function extrude(shape, depth, mat, o = {}) { const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, ...o }); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
export function instanced(geo, mat, count) { const im = new THREE.InstancedMesh(geo, mat, count); im.castShadow = true; im.receiveShadow = true; im.userData.dynamic = true; return im; }
export function group(...children) { const g = new THREE.Group(); for (const c of children) if (c) g.add(c); return g; }
export function at(obj, x, y, z, rotY) { obj.position.set(x, y, z); if (rotY) obj.rotation.y = rotY; return obj; }
export function dynamic(obj) { obj.userData.dynamic = true; return obj; }

/**
 * Merges every static Mesh of `root` into one Mesh per material (a handful of draw calls instead of thousands).
 * InstancedMesh, sprites, lines, lights and anything flagged `userData.dynamic` are kept as separate objects.
 */
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out = new THREE.Group(); out.name = root.name; out.userData = { ...root.userData };
  const byMat = new Map(); const keep = [];
  const visit = obj => {
    if (obj !== root && (obj.userData.dynamic || obj.isInstancedMesh || obj.isSprite || obj.isLine || obj.isLight || obj.isPoints)) { keep.push(obj); return; }
    if (obj.isMesh && obj.geometry && obj.geometry.attributes.position && !Array.isArray(obj.material)) {
      const g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, obj.matrixWorld));
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}`;
      if (!byMat.has(key)) byMat.set(key, { mat: obj.material, geos: [], cast: obj.castShadow, recv: obj.receiveShadow });
      byMat.get(key).geos.push(g);
    }
    for (const c of obj.children.slice()) visit(c);
  };
  visit(root);
  for (const { mat, geos, cast, recv } of byMat.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = recv; out.add(m);
  }
  for (const obj of keep) { const m = new THREE.Matrix4().multiplyMatrices(inv, obj.matrixWorld); obj.removeFromParent(); m.decompose(obj.position, obj.quaternion, obj.scale); out.add(obj); }
  return out;
}

/** Small rounded label pill (sprite) for units / landmarks. */
export function label(text, o = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    try {
      ctx.font = `bold ${o.font ?? 52}px Cairo, "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(500, ctx.measureText(text).width + 60); const x = 256 - w / 2;
      ctx.fillStyle = o.bg ?? 'rgba(10,20,30,.72)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, 20, w, 88, 44) : ctx.rect(x, 20, w, 88); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = o.color ?? '#f2f6f9'; ctx.fillText(text, 256, 66);
    } catch { /* headless */ }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.material.sizeAttenuation = false; const s = o.scale ?? .11; sp.scale.set(s, s / 4, 1); sp.renderOrder = 10; sp.userData.dynamic = true;
  return sp;
}

/** Smoke / steam plume made of soft sprites. `update(dt, intensity 0..1, wind {x,z})`. */
export function plume(color = 0xdddddd, count = 40, o = {}) {
  const g = new THREE.Group(); g.userData.dynamic = true;
  const map = T.plumeSprite();
  const parts = [];
  const rise = o.rise ?? 26, spread = o.spread ?? 1, base = o.size ?? 3, alpha = o.alpha ?? .32;
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { life: i / count, speed: .7 + Math.random() * .6, dx: (Math.random() - .5), dz: (Math.random() - .5) };
    g.add(s); parts.push(s);
  }
  g.userData.update = (dt, intensity, wind = { x: 1, z: .2 }) => {
    const on = intensity > .03; g.visible = on; if (!on) return;
    for (const p of parts) {
      p.userData.life += dt * .22 * p.userData.speed; if (p.userData.life > 1) p.userData.life -= 1;
      const l = p.userData.life, drift = l * l;
      p.position.set(wind.x * drift * rise * 1.4 + p.userData.dx * l * 6 * spread, l * rise + 1, wind.z * drift * rise * 1.4 + p.userData.dz * l * 6 * spread);
      const sc = base + l * rise * .55 * spread * (.6 + intensity * .6); p.scale.set(sc, sc, 1);
      p.material.opacity = Math.sin(l * Math.PI) * alpha * Math.min(1, intensity * 1.4) * (o.opacityScale ?? 1);
    }
  };
  return g;
}
/** Additive glow sprite (lamps, receiver); intensity via material.opacity. */
export function glow(color = 0xffe0a0, size = 6) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glowSprite(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.set(size, size, 1); sp.userData.dynamic = true; return sp;
}
