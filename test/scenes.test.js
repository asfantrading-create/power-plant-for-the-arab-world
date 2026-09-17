'use strict';
/** Builds every 3D scene (geometry only, no WebGL) to catch construction errors such as read-only three.js properties. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadDataset } = require('./helpers');

let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch { JSDOM = null; }
const skip = !JSDOM;
const ds = loadDataset();

test('composeScene builds a group with animated parts for every technology and hero plant', { skip }, async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const noop = new Proxy({}, { get: (_, p) => (typeof p === 'string' ? () => noop : undefined), set: () => true });
  dom.window.HTMLCanvasElement.prototype.getContext = () => noop;
  globalThis.document = dom.window.document; globalThis.window = dom.window; globalThis.self = dom.window;
  try {
    const { composeScene } = await import('../src/renderer/js/twin/scenes.js');
    const { unitLayout } = await import('../src/renderer/js/twin/engine.js');
    const samples = [];
    for (const techCode of Object.keys(ds.technologies)) { const p = ds.plants.find(x => x.technology === techCode && !x.hero); if (p) samples.push(p); }
    for (const p of ds.plants.filter(x => x.hero)) samples.push(p);
    for (const p of ds.plants.filter(x => x.complex === 'noor-ouarzazate' || x.complex === 'mbr-solar-park').slice(0, 3)) samples.push(p);
    assert.ok(samples.length >= 20);
    for (const p of samples) {
      const layout = unitLayout(p, p.technology);
      const scene = composeScene(p, p.technology, layout.count, layout.unitMw);
      assert.ok(scene.group.children.length > 0, 'empty scene for ' + p.id);
      assert.ok(scene.cameraDistance > 0);
      const units = Array.from({ length: layout.count }, (_, i) => ({ id: i + 1, output: layout.unitMw * 0.8, capacityMw: layout.unitMw, state: 'on' }));
      scene.update({ units, sun: { elevation: 45, azimuth: 180 }, dni: 800, ghi: 900, fieldMwth: 300, rotorRpm: 12, reservoirLevel: 0.9 }, 0.016, 1);
      scene.update({ units, sun: { elevation: -10, azimuth: 300 }, dni: 0, ghi: 0, fieldMwth: 0, rotorRpm: 0, reservoirLevel: 1 }, 0.016, 1);
    }
  } finally { delete globalThis.document; delete globalThis.window; delete globalThis.self; dom.window.close(); }
});
