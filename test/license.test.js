'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const lic = require('../src/main/services/license');

const { publicKeyPem, privateKeyPem } = lic.generateKeyPair();
const other = lic.generateKeyPair();

test('lifetime license round-trips and verifies offline', () => {
  const key = lic.issue({ licensee: { name: 'Dr. Test', org: 'Test University', email: 't@u.edu' }, type: 'lifetime', seats: 30 }, privateKeyPem);
  assert.ok(key.startsWith('APT1.'));
  const res = lic.verify(key, { publicKeyPems: [publicKeyPem] });
  assert.equal(res.valid, true); assert.equal(res.reason, null);
  assert.equal(res.license.licensee.org, 'Test University'); assert.equal(res.license.seats, 30); assert.equal(res.license.expiresAt, null);
  assert.equal(lic.verify(key, { publicKeyPems: [other.publicKeyPem] }).reason, 'bad_signature');
  assert.equal(lic.verify(key + 'x', { publicKeyPems: [publicKeyPem] }).reason, 'bad_signature');
  assert.equal(lic.verify('APT1.abc', { publicKeyPems: [publicKeyPem] }).reason, 'malformed');
  assert.equal(lic.verify(key, { publicKeyPems: [] }).reason, 'no_public_key');
});

test('term license expiry, days left and clock tamper flag', () => {
  const key = lic.issue({ licensee: { org: 'Co' }, type: 'term', expiresAt: '2030-06-30', seats: 5 }, privateKeyPem);
  const ok = lic.verify(key, { publicKeyPems: [publicKeyPem], now: new Date('2030-06-01T00:00:00Z') });
  assert.equal(ok.valid, true); assert.ok(ok.daysLeft >= 29 && ok.daysLeft <= 30);
  const expired = lic.verify(key, { publicKeyPems: [publicKeyPem], now: new Date('2030-07-01T00:00:00Z') });
  assert.equal(expired.valid, false); assert.equal(expired.reason, 'expired');
  assert.equal(lic.verify(key, { publicKeyPems: [publicKeyPem], now: new Date('2029-01-01'), clockTampered: true }).reason, 'clock_tampered');
  assert.throws(() => lic.issue({ licensee: { org: 'Co' }, type: 'term' }, privateKeyPem), /expiresAt/);
});

test('machine-locked license only works on the matching machine', () => {
  const mid = lic.formatMachineId('win:1234-abcd');
  assert.match(mid, /^APT-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  const key = lic.issue({ licensee: { name: 'Lab PC' }, type: 'lifetime', machineId: mid }, privateKeyPem);
  assert.equal(lic.verify(key, { publicKeyPems: [publicKeyPem], machineId: mid }).valid, true);
  assert.equal(lic.verify(key, { publicKeyPems: [publicKeyPem], machineId: lic.formatMachineId('other') }).reason, 'machine_mismatch');
});

test('tampering with the payload invalidates the signature', () => {
  const key = lic.issue({ licensee: { org: 'Co' }, type: 'term', expiresAt: '2027-01-01' }, privateKeyPem);
  const [p, body, sig] = key.split('.');
  const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  payload.expiresAt = '2099-01-01';
  const forged = `${p}.${Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${sig}`;
  assert.equal(lic.verify(forged, { publicKeyPems: [publicKeyPem] }).reason, 'bad_signature');
});

test('license features normalise legacy and new forms; seats default to unlimited', () => {
  assert.deepEqual(lic.featuresOf(null), { modules: ['twin', 'exams'], technologies: null });
  assert.deepEqual(lic.featuresOf({ features: ['all'] }), { modules: ['twin', 'exams'], technologies: null });
  assert.deepEqual(lic.featuresOf({ features: { modules: ['exams', 'bogus'], technologies: ['pv'] } }), { modules: ['exams'], technologies: ['pv'] });
  assert.deepEqual(lic.featuresOf({ features: { modules: ['bogus'], technologies: [] } }), { modules: ['twin', 'exams'], technologies: null });
  const key = lic.issue({ licensee: { org: 'Co' }, type: 'lifetime', machineId: 'apt-1234-abcd-ef01-2345' }, privateKeyPem);
  const res = lic.verify(key, { publicKeyPems: [publicKeyPem] });
  assert.equal(res.license.seats, 0); assert.equal(res.license.machineId, 'APT-1234-ABCD-EF01-2345');
  assert.deepEqual(res.license.features, { modules: ['twin', 'exams'], technologies: null });
});
