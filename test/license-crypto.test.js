'use strict';
/** The browser license generator must produce keys that the application (Node crypto) accepts, and vice versa. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const lic = require('../src/main/services/license');
const LC = require('../tools/license-generator/license-crypto.js');

const { publicKeyPem, privateKeyPem } = lic.generateKeyPair();
const input = { licensee: { name: 'Prof. Web', org: 'Web University', email: 'w@u.edu' }, type: 'term', expiresAt: '2030-01-31', seats: 25, machineId: null, features: { modules: ['twin'], technologies: ['pv', 'wind_onshore'] }, notes: 'from browser' };

for (const mode of ['webcrypto', 'fallback']) {
  test(`${mode}: keys issued in the browser generator verify in the app, and app keys verify in the generator`, async () => {
    LC.useWebCrypto = mode === 'webcrypto';
    // public key derived by the fallback must match Node's
    const seed = LC.seedFromPrivatePem(privateKeyPem);
    const nodePub = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }).subarray(-32);
    assert.deepEqual(Buffer.from(await LC.publicKeyFromSeed(seed)), Buffer.from(nodePub));
    // browser -> app
    const { key, payload } = await LC.issueLicense(input, privateKeyPem);
    assert.ok(key.startsWith('APT1.'));
    const res = lic.verify(key, { publicKeyPems: [publicKeyPem], now: new Date('2029-12-01') });
    assert.equal(res.valid, true, JSON.stringify(res));
    assert.equal(res.license.seats, 25); assert.deepEqual(res.license.features, { modules: ['twin'], technologies: ['pv', 'wind_onshore'] });
    assert.equal(lic.verify(key, { publicKeyPems: [publicKeyPem], now: new Date('2030-03-01') }).reason, 'expired');
    assert.equal(lic.verify(key, { publicKeyPems: [lic.generateKeyPair().publicKeyPem] }).reason, 'bad_signature');
    assert.equal(payload.product, 'arab-power-twin');
    // app -> browser
    const nodeKey = lic.issue({ licensee: { org: 'Node Org' }, type: 'lifetime', seats: 0, features: { modules: ['twin', 'exams'], technologies: null } }, privateKeyPem);
    const v = await LC.verifyLicense(nodeKey, publicKeyPem);
    assert.equal(v.valid, true, JSON.stringify(v)); assert.equal(v.license.seats, 0);
    const forged = nodeKey.slice(0, -4) + 'AAAA';
    assert.equal((await LC.verifyLicense(forged, publicKeyPem)).reason, 'bad_signature');
    assert.equal((await LC.verifyLicense('APT1.x', publicKeyPem)).reason, 'malformed');
    // raw signature interop both ways
    const msg = new TextEncoder().encode('hello twin');
    const sig = await LC.sign(seed, msg);
    assert.equal(crypto.verify(null, msg, crypto.createPublicKey(publicKeyPem), Buffer.from(sig)), true);
    const nodeSig = crypto.sign(null, msg, crypto.createPrivateKey(privateKeyPem));
    assert.equal(await LC.verify(nodePub, msg, new Uint8Array(nodeSig)), true);
    assert.equal(await LC.verify(nodePub, new TextEncoder().encode('tampered'), new Uint8Array(nodeSig)), false);
  });
}
