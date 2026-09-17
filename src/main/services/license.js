'use strict';
/**
 * Offline license keys signed with Ed25519 by the vendor's private key.
 *
 * Key format:  APT1.<base64url(payload JSON)>.<base64url(signature)>
 * Payload:     { v:1, id, product:'arab-power-twin', type:'lifetime'|'term', licensee:{name,org,email},
 *                issuedAt:'YYYY-MM-DD', expiresAt:'YYYY-MM-DD'|null, seats:number, machineId:string|null,
 *                features:['all'], notes:'' }
 * Verification is fully offline: the application only embeds the vendor's PUBLIC key.
 */
const crypto = require('node:crypto');

const PREFIX = 'APT1';
const PRODUCT = 'arab-power-twin';
/** Application modules a license can include. */
const MODULES = ['twin', 'exams'];

const b64u = {
  encode: buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
};

/** Canonical JSON: keys sorted recursively so signatures are stable. */
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

function issue(payloadInput, privateKeyPem) {
  const payload = {
    v: 1,
    id: payloadInput.id || crypto.randomUUID(),
    product: PRODUCT,
    type: payloadInput.type === 'term' ? 'term' : 'lifetime',
    licensee: {
      name: String(payloadInput.licensee?.name || '').trim(),
      org: String(payloadInput.licensee?.org || '').trim(),
      email: String(payloadInput.licensee?.email || '').trim(),
    },
    issuedAt: payloadInput.issuedAt || new Date().toISOString().slice(0, 10),
    expiresAt: payloadInput.type === 'term' ? payloadInput.expiresAt : null,
    seats: Number.isFinite(Number(payloadInput.seats)) && Number(payloadInput.seats) >= 0 ? Math.floor(Number(payloadInput.seats)) : 0, // 0 = unlimited accounts
    machineId: payloadInput.machineId ? String(payloadInput.machineId).trim().toUpperCase() : null,
    features: normalizeFeatures(payloadInput.features),
    notes: String(payloadInput.notes || ''),
  };
  if (!payload.licensee.name && !payload.licensee.org) throw new Error('licensee name or organisation is required');
  if (payload.type === 'term' && !/^\d{4}-\d{2}-\d{2}$/.test(payload.expiresAt || '')) throw new Error('term licenses need expiresAt (YYYY-MM-DD)');
  const data = Buffer.from(canonical(payload), 'utf8');
  const signature = crypto.sign(null, data, crypto.createPrivateKey(privateKeyPem));
  return `${PREFIX}.${b64u.encode(data)}.${b64u.encode(signature)}`;
}

function parse(key) {
  const clean = String(key || '').replace(/\s+/g, '');
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) throw new Error('malformed');
  const data = b64u.decode(parts[1]);
  const signature = b64u.decode(parts[2]);
  const payload = JSON.parse(data.toString('utf8'));
  return { payload, data, signature };
}

/**
 * @param {string} key
 * @param {{publicKeyPems:string[], machineId?:string, now?:Date, clockTampered?:boolean}} opts
 * @returns {{valid:boolean, reason:string|null, license:object|null, daysLeft:number|null}}
 */
function verify(key, opts) {
  const result = { valid: false, reason: null, license: null, daysLeft: null };
  let parsed;
  try { parsed = parse(key); } catch { result.reason = 'malformed'; return result; }
  const { payload, data, signature } = parsed;
  result.license = payload;
  const pems = (opts.publicKeyPems || []).filter(Boolean);
  if (!pems.length) { result.reason = 'no_public_key'; return result; }
  let ok = false;
  for (const pem of pems) {
    try { if (crypto.verify(null, Buffer.from(canonical(payload), 'utf8'), crypto.createPublicKey(pem), signature)) { ok = true; break; } } catch { /* try next */ }
  }
  if (!ok || !data) { result.reason = 'bad_signature'; return result; }
  if (payload.product !== PRODUCT || payload.v !== 1) { result.reason = 'wrong_product'; return result; }
  if (payload.machineId && opts.machineId && payload.machineId !== opts.machineId) { result.reason = 'machine_mismatch'; return result; }
  if (payload.type === 'term') {
    if (opts.clockTampered) { result.reason = 'clock_tampered'; return result; }
    const now = opts.now || new Date();
    const exp = new Date(payload.expiresAt + 'T23:59:59Z');
    if (Number.isNaN(exp.getTime())) { result.reason = 'malformed'; return result; }
    result.daysLeft = Math.ceil((exp - now) / 86400000);
    if (now > exp) { result.reason = 'expired'; return result; }
  }
  result.valid = true;
  return result;
}

/** Normalises the features block of a license: { modules: [...], technologies: [...]|null }. Legacy ['all'] => everything. */
function normalizeFeatures(f) {
  const modules = f && !Array.isArray(f) && Array.isArray(f.modules) && f.modules.length ? f.modules.filter(m => MODULES.includes(m)) : MODULES.slice();
  const technologies = f && !Array.isArray(f) && Array.isArray(f.technologies) && f.technologies.length ? f.technologies.map(String) : null;
  return { modules: modules.length ? modules : MODULES.slice(), technologies };
}
/** Effective features of a (verified) license payload. */
function featuresOf(license) { return normalizeFeatures(license ? license.features : null); }

/** Human-readable machine id shown on the activation screen (stable per PC). */
function formatMachineId(raw) {
  const h = crypto.createHash('sha256').update(String(raw)).digest('hex').toUpperCase();
  return `APT-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

module.exports = { PREFIX, PRODUCT, MODULES, generateKeyPair, issue, parse, verify, canonical, formatMachineId, normalizeFeatures, featuresOf };
