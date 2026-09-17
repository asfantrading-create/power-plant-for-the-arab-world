'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadDataset, loadBank } = require('./helpers');

const ds = loadDataset();
const ARAB = ['DZA', 'BHR', 'COM', 'DJI', 'EGY', 'IRQ', 'JOR', 'KWT', 'LBN', 'LBY', 'MRT', 'MAR', 'OMN', 'PSE', 'QAT', 'SAU', 'SOM', 'SDN', 'SYR', 'TUN', 'ARE', 'YEM'];

test('dataset covers all 22 Arab League countries with consistent records', () => {
  assert.equal(ds.countries.length, 22);
  assert.deepEqual(ds.countries.map(c => c.iso3).sort(), ARAB.slice().sort());
  for (const iso of ARAB) assert.ok(ds.plants.some(p => p.country === iso), 'no plants for ' + iso);
  assert.ok(ds.plants.length >= 600);
  const ids = new Set();
  for (const p of ds.plants) {
    assert.ok(!ids.has(p.id), 'duplicate id ' + p.id); ids.add(p.id);
    assert.ok(p.capacityMw > 0 && p.capacityMw < 20000, p.id);
    assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180, p.id);
    assert.ok(ds.technologies[p.technology], 'unknown technology ' + p.technology + ' for ' + p.id);
    assert.ok(['operational', 'under_construction', 'planned', 'decommissioned'].includes(p.status), p.id);
    assert.ok(ARAB.includes(p.country));
    if (p.complex) assert.ok(ds.complexes.find(c => c.id === p.complex), 'unknown complex ' + p.complex);
  }
});

test('landmark plants are present with real figures', () => {
  const find = id => ds.plants.find(p => p.id === id);
  assert.equal(find('are-barakah').capacityMw, 5600);
  assert.equal(find('are-barakah').technology, 'nuclear_pwr');
  assert.equal(ds.plants.find(p => p.name === 'Aswan High Dam').capacityMw, 2100);
  assert.equal(find('egy-beni-suef-ccgt').capacityMw, 4800);
  assert.equal(find('mar-safi-coal').technology, 'coal_steam');
  assert.equal(find('jor-attarat').technology, 'oil_shale');
  assert.equal(find('sau-dumat-al-jandal-wind').units, 99);
  assert.ok(ds.plants.filter(p => p.complex === 'noor-ouarzazate').length >= 4);
  const totalGw = ds.plants.filter(p => p.status === 'operational' && !p.excludeFromTotals).reduce((a, p) => a + p.capacityMw, 0) / 1000;
  assert.ok(totalGw > 300 && totalGw < 500, 'implausible total ' + totalGw);
});

test('question bank is bilingual and well-formed', () => {
  const bank = loadBank();
  assert.ok(bank.questions.length >= 100);
  for (const q of bank.questions) {
    assert.ok(bank.topics[q.topic], q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.correct >= 0 && q.correct < 4, q.id);
    assert.ok(q.prompt.ar && q.prompt.en && q.explanation.ar && q.explanation.en, q.id);
  }
});
