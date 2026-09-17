'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadDataset } = require('./helpers');

const ds = loadDataset();
const byId = id => ds.plants.find(p => p.id === id);
let engineMod, solarMod;
test.before(async () => { engineMod = await import('../src/renderer/js/twin/engine.js'); solarMod = await import('../src/renderer/js/twin/solar.js'); });

test('solar position: high sun at solar noon in Riyadh in June, below horizon at midnight', () => {
  const { sunPosition, clearSkyGhi } = solarMod;
  const noon = sunPosition(new Date('2026-06-21T09:00:00Z'), 24.7, 46.7); // ~12:07 local solar time
  assert.ok(noon.elevation > 80, 'noon elevation ' + noon.elevation);
  const midnight = sunPosition(new Date('2026-06-21T21:00:00Z'), 24.7, 46.7);
  assert.ok(midnight.elevation < 0);
  assert.ok(clearSkyGhi(noon.elevation) > 950 && clearSkyGhi(noon.elevation) < 1100);
  assert.equal(clearSkyGhi(-5), 0);
});

test('PV plant produces nothing at night and near rated output at clear noon', () => {
  const { PlantSimulation } = engineMod;
  const p = byId('are-al-dhafra-pv');
  const night = new PlantSimulation(p, ds.technologies.pv, 'pv', { startTime: '2026-03-20T22:00:00Z', ambientC: 25 });
  night.env.cloud = 0; night.tick(600);
  assert.equal(night.state.outputMw, 0);
  const day = new PlantSimulation(p, ds.technologies.pv, 'pv', { startTime: '2026-03-20T08:30:00Z', ambientC: 25 });
  day.env.cloud = 0; day.env.dust = 0; day.tick(600);
  assert.ok(day.state.outputMw > p.capacityMw * 0.7, 'noon output ' + day.state.outputMw);
  assert.ok(day.state.outputMw <= p.capacityMw + 1e-6);
  assert.ok(day.kpis().energyMwh > 0);
  for (const v of Object.values(day.state)) if (typeof v === 'number') assert.ok(!Number.isNaN(v));
});

test('wind farm follows the cubic power curve and stops above cut-out', () => {
  const { PlantSimulation } = engineMod;
  const p = byId('sau-dumat-al-jandal-wind');
  const sim = new PlantSimulation(p, ds.technologies.wind_onshore, 'wind_onshore', { startTime: '2026-01-10T10:00:00Z' });
  sim.env.windMs = 12; sim.state.windHub = 12; sim.tick(30);
  assert.ok(sim.state.outputMw > p.capacityMw * 0.6, 'rated wind output ' + sim.state.outputMw);
  sim.env.windMs = 6; sim.state.windHub = 6; sim.tick(30);
  const low = sim.state.outputMw;
  assert.ok(low > 0 && low < p.capacityMw * 0.35, 'half wind speed gives ~1/8 power: ' + low);
  sim.env.windMs = 30; sim.state.windHub = 30; sim.tick(30);
  assert.equal(sim.state.outputMw, 0);
  assert.ok(sim.state.alarms.some(a => a.id === 'cutout'));
});

test('hydro plant obeys P = rho g Q H eta and the reservoir balance', () => {
  const { PlantSimulation } = engineMod;
  const p = ds.plants.find(x => x.name === 'Aswan High Dam');
  const sim = new PlantSimulation(p, ds.technologies.hydro_dam, 'hydro_dam', { startTime: '2026-01-10T10:00:00Z' });
  sim.controls.gateFrac = 1; sim.env.flowFrac = 0.2; sim.tick(60);
  const s = sim.state;
  const expected = 1000 * 9.81 * s.flowM3s * s.headM * 0.9 / 1e6;
  assert.ok(Math.abs(s.outputMw - Math.min(p.capacityMw, expected)) < 1, `${s.outputMw} vs ${expected}`);
  const before = s.reservoirLevel; sim.tick(3600 * 6);
  assert.ok(sim.state.reservoirLevel < before, 'level must drop when outflow exceeds inflow');
});

test('combined-cycle plant ramps to setpoint, derates in heat, and handles a trip scenario', () => {
  const { PlantSimulation } = engineMod;
  const p = byId('egy-beni-suef-ccgt');
  const sim = new PlantSimulation(p, ds.technologies.ccgt, 'ccgt', { startTime: '2026-01-10T10:00:00Z', ambientC: 15, seed: 7 });
  sim.controls.setpoint = 1; sim.tick(3600);
  const full = sim.state.outputMw;
  assert.ok(full > p.capacityMw * 0.95 && full <= p.capacityMw * 1.06, 'full load ' + full);
  assert.ok(sim.state.efficiency > 0.5 && sim.state.efficiency < 0.62);
  assert.ok(sim.state.co2KgS > 0 && sim.state.fuelKgS > 0);
  sim.env.ambientC = 45; sim.tick(3600);
  assert.ok(sim.state.outputMw < full * 0.9, 'hot ambient must derate: ' + sim.state.outputMw);
  const trips = sim.kpi.trips;
  sim.applyScenario('trip');
  assert.equal(sim.kpi.trips, trips + 1);
  assert.ok(sim.units.some(u => u.state === 'trip'));
  sim.tick(120);
  assert.ok(sim.state.frequencyHz < 50, 'frequency dips after a trip: ' + sim.state.frequencyHz);
  const k = sim.kpis();
  assert.ok(k.energyMwh > 0 && k.capacityFactor > 0 && k.availability <= 1);
});

test('CSP tower charges storage by day and keeps generating after sunset', () => {
  const { PlantSimulation } = engineMod;
  const p = ds.plants.find(x => x.technology === 'csp_tower' && x.complex === 'noor-ouarzazate');
  const sim = new PlantSimulation(p, ds.technologies.csp_tower, 'csp_tower', { startTime: '2026-06-21T07:00:00Z', ambientC: 30 });
  sim.env.cloud = 0; sim.env.dust = 0; sim.controls.setpoint = 0.5;
  const s0 = sim.state.storageMwh; sim.tick(6 * 3600);
  assert.ok(sim.state.storageMwh > s0, 'storage should charge');
  sim.tick(14 * 3600); // now night
  assert.ok(sim.state.sun.elevation < 0);
  assert.ok(sim.state.outputMw > 0, 'stored heat keeps the turbine running at night');
});

test('unit layout is sensible for every technology', () => {
  const { unitLayout } = engineMod;
  for (const p of ds.plants) { const l = unitLayout(p, p.technology); assert.ok(l.count >= 1 && l.count <= 200 && l.unitMw > 0, p.id); }
});
