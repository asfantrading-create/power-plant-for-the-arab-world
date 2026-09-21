'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const lic = require('../src/main/services/license');

const { publicKeyPem, privateKeyPem } = lic.generateKeyPair();
const other = lic.generateKeyPair();

test('subscription plans compute the expiry date; staff licenses never expire; legacy keys map to a plan', () => {
  assert.equal(lic.addPeriod('2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(lic.addPeriod('2026-12-15', 'monthly', 2), '2027-02-15');
  assert.equal(lic.addPeriod('2028-02-29', 'yearly', 1), '2029-02-28');
  assert.equal(lic.addPeriod('2026-09-21', 'yearly', 3), '2029-09-21');
  assert.throws(() => lic.addPeriod('bad', 'monthly', 1), /start date/);
  const monthly = lic.verify(lic.issue({ licensee: { org: 'Co' }, plan: 'monthly', startsAt: '2030-01-31', seats: 5 }, privateKeyPem), { publicKeyPems: [publicKeyPem], now: new Date('2030-02-10T00:00:00Z') });
  assert.equal(monthly.valid, true); assert.equal(monthly.license.plan, 'monthly'); assert.equal(monthly.license.type, 'term'); assert.equal(monthly.license.expiresAt, '2030-02-28'); assert.equal(monthly.daysLeft, 19);
  const yearly = lic.parse(lic.issue({ licensee: { org: 'Co' }, plan: 'yearly', periods: 2, startsAt: '2030-03-01' }, privateKeyPem)).payload;
  assert.equal(yearly.plan, 'yearly'); assert.equal(yearly.expiresAt, '2032-03-01');
  const dflt = lic.parse(lic.issue({ licensee: { org: 'Co' } }, privateKeyPem)).payload; // nothing specified => one-year subscription, never unlimited
  assert.equal(dflt.plan, 'yearly'); assert.equal(dflt.expiresAt, lic.addPeriod(dflt.issuedAt, 'yearly', 1));
  const staff = lic.verify(lic.issue({ licensee: { org: 'Asfan' }, plan: 'staff' }, privateKeyPem), { publicKeyPems: [publicKeyPem], now: new Date('2099-01-01') });
  assert.equal(staff.valid, true); assert.equal(staff.license.type, 'lifetime'); assert.equal(staff.license.plan, 'staff'); assert.equal(staff.license.expiresAt, null); assert.equal(staff.daysLeft, null);
  assert.equal(lic.parse(lic.issue({ licensee: { org: 'Co' }, plan: 'custom', expiresAt: '2031-01-01' }, privateKeyPem)).payload.plan, 'custom');
  assert.throws(() => lic.issue({ licensee: { org: 'Co' }, plan: 'custom' }, privateKeyPem), /expiresAt/);
  // legacy inputs and payloads (issued before 1.2.0 without `plan`)
  assert.equal(lic.parse(lic.issue({ licensee: { org: 'Co' }, type: 'lifetime' }, privateKeyPem)).payload.plan, 'staff');
  assert.equal(lic.parse(lic.issue({ licensee: { org: 'Co' }, type: 'term', expiresAt: '2031-01-01' }, privateKeyPem)).payload.plan, 'custom');
  assert.equal(lic.planOf({ type: 'term', expiresAt: '2031-01-01' }), 'custom'); assert.equal(lic.planOf({ type: 'lifetime' }), 'staff'); assert.equal(lic.planOf({ type: 'term', plan: 'monthly' }), 'monthly'); assert.equal(lic.planOf(null), null);
});

test('staff (no-expiry) license round-trips and verifies offline', () => {
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
