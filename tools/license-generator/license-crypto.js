/*
 * Arab Power Twin — license cryptography shared by the browser-based license generator and the tests.
 * Ed25519 signatures over canonical JSON, identical to src/main/services/license.js.
 * Uses WebCrypto Ed25519 when the browser supports it and falls back to a pure-JS (BigInt) RFC 8032 implementation.
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  root.LicenseCrypto = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PREFIX = 'APT1', PRODUCT = 'arab-power-twin';
  const MODULES = ['twin', 'exams'];
  const PLANS = ['monthly', 'yearly', 'custom', 'staff'];
  const subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
  if (!subtle) throw new Error('WebCrypto (crypto.subtle) is required');

  // ---------- encoding helpers ----------
  const te = new TextEncoder(), td = new TextDecoder();
  function b64uEncode(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64uDecode(str) { const p = str.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(p + '='.repeat((4 - p.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
  function concat(...arrs) { const n = arrs.reduce((a, b) => a + b.length, 0); const out = new Uint8Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function pemToDer(pem) { const b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''); const bin = atob(b64); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
  /** PKCS#8 Ed25519 private key (48-byte DER): the seed is the last 32 bytes. */
  function seedFromPrivatePem(pem) { const der = pemToDer(pem); if (der.length < 32 || !/PRIVATE KEY/.test(pem)) throw new Error('not an Ed25519 private key PEM'); return der.slice(der.length - 32); }
  /** SubjectPublicKeyInfo Ed25519 (44-byte DER): the public key is the last 32 bytes. */
  function pubFromPublicPem(pem) { const der = pemToDer(pem); if (der.length < 32 || !/PUBLIC KEY/.test(pem)) throw new Error('not an Ed25519 public key PEM'); return der.slice(der.length - 32); }
  const PKCS8_PREFIX = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  const SPKI_PREFIX = Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
  function publicPemFromRaw(pub) { const der = concat(SPKI_PREFIX, pub); let b64 = btoa(String.fromCharCode(...der)); return '-----BEGIN PUBLIC KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PUBLIC KEY-----\n'; }

  // ---------- Ed25519 fallback (RFC 8032) with BigInt ----------
  const P = (1n << 255n) - 19n;
  const L = (1n << 252n) + 27742317777372353535851937790883648493n;
  const mod = (a, m = P) => { const r = a % m; return r >= 0n ? r : r + m; };
  function modpow(b, e, m) { let r = 1n; b = mod(b, m); while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; }
  const inv = a => modpow(a, P - 2n, P);
  const D = mod(-121665n * inv(121666n));
  const SQRT_M1 = modpow(2n, (P - 1n) / 4n, P);
  function recoverX(y, sign) {
    const y2 = mod(y * y); const u = mod(y2 - 1n); const v = mod(D * y2 + 1n);
    const uv = mod(u * inv(v));
    let x = modpow(uv, (P + 3n) / 8n, P);
    if (mod(x * x - uv) !== 0n) x = mod(x * SQRT_M1);
    if (mod(x * x - uv) !== 0n) throw new Error('invalid point');
    if ((x & 1n) !== BigInt(sign)) x = P - x;
    return x;
  }
  function add(p, q) {
    const [X1, Y1, Z1, T1] = p, [X2, Y2, Z2, T2] = q;
    const A = mod((Y1 - X1) * (Y2 - X2)), B = mod((Y1 + X1) * (Y2 + X2)), C = mod(2n * T1 * T2 * D), Dd = mod(2n * Z1 * Z2);
    const E = B - A, F = Dd - C, G = Dd + C, H = B + A;
    return [mod(E * F), mod(G * H), mod(F * G), mod(E * H)];
  }
  function mul(p, s) { let r = [0n, 1n, 1n, 0n], q = p; while (s > 0n) { if (s & 1n) r = add(r, q); q = add(q, q); s >>= 1n; } return r; }
  const toLE = (n, len) => { const out = new Uint8Array(len); for (let i = 0; i < len; i++) { out[i] = Number(n & 0xffn); n >>= 8n; } return out; };
  const fromLE = bytes => { let n = 0n; for (let i = bytes.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]); return n; };
  const Gy = mod(4n * inv(5n)); const Gx = recoverX(Gy, 0); const G = [Gx, Gy, 1n, mod(Gx * Gy)];
  function encodePoint(p) { const zi = inv(p[2]); const x = mod(p[0] * zi), y = mod(p[1] * zi); const b = toLE(y, 32); b[31] |= Number(x & 1n) << 7; return b; }
  function decodePoint(bytes) { const b = new Uint8Array(bytes); const sign = b[31] >> 7; b[31] &= 0x7f; const y = fromLE(b); if (y >= P) throw new Error('invalid point'); const x = recoverX(y, sign); return [x, y, 1n, mod(x * y)]; }
  function pointEq(p, q) { return mod(p[0] * q[2] - q[0] * p[2]) === 0n && mod(p[1] * q[2] - q[1] * p[2]) === 0n; }
  async function sha512(bytes) { return new Uint8Array(await subtle.digest('SHA-512', bytes)); }
  function clamp(bytes) { const b = new Uint8Array(bytes); b[0] &= 248; b[31] &= 127; b[31] |= 64; return fromLE(b); }
  async function keyFromSeed(seed) { const h = await sha512(seed); const a = clamp(h.slice(0, 32)); const A = mul(G, a); return { a, prefix: h.slice(32), A: encodePoint(A) }; }
  async function signFallback(seed, msg) {
    const { a, prefix, A } = await keyFromSeed(seed);
    const r = mod(fromLE(await sha512(concat(prefix, msg))), L);
    const R = encodePoint(mul(G, r));
    const k = mod(fromLE(await sha512(concat(R, A, msg))), L);
    const S = mod(r + k * a, L);
    return concat(R, toLE(S, 32));
  }
  async function verifyFallback(pub, msg, sig) {
    try {
      if (sig.length !== 64 || pub.length !== 32) return false;
      const R = decodePoint(sig.slice(0, 32)); const S = fromLE(sig.slice(32)); if (S >= L) return false;
      const A = decodePoint(pub);
      const k = mod(fromLE(await sha512(concat(sig.slice(0, 32), pub, msg))), L);
      return pointEq(mul(G, S), add(R, mul(A, k)));
    } catch { return false; }
  }
  async function publicKeyFromSeed(seed) { return (await keyFromSeed(seed)).A; }

  // ---------- WebCrypto path with fallback ----------
  let webCryptoOk = null;
  async function webCryptoSupported() {
    if (webCryptoOk !== null) return webCryptoOk;
    try { await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); webCryptoOk = true; } catch { webCryptoOk = false; }
    return webCryptoOk;
  }
  async function sign(seed, msg) {
    if (lib.useWebCrypto && await webCryptoSupported()) {
      const key = await subtle.importKey('pkcs8', concat(PKCS8_PREFIX, seed), { name: 'Ed25519' }, false, ['sign']);
      return new Uint8Array(await subtle.sign({ name: 'Ed25519' }, key, msg));
    }
    return signFallback(seed, msg);
  }
  async function verify(pub, msg, sig) {
    if (lib.useWebCrypto && await webCryptoSupported()) {
      try { const key = await subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']); return await subtle.verify({ name: 'Ed25519' }, key, sig, msg); } catch { return false; }
    }
    return verifyFallback(pub, msg, sig);
  }

  // ---------- license payload (mirrors src/main/services/license.js) ----------
  function normalizeFeatures(f) {
    const modules = f && Array.isArray(f.modules) && f.modules.length ? f.modules.filter(m => MODULES.includes(m)) : MODULES.slice();
    const technologies = f && Array.isArray(f.technologies) && f.technologies.length ? f.technologies.map(String) : null;
    return { modules: modules.length ? modules : MODULES.slice(), technologies };
  }
  function addPeriod(dateStr, plan, periods) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
    if (!m) throw new Error('invalid start date (YYYY-MM-DD)');
    const n = Math.max(1, Math.floor(Number(periods) || 1));
    const months = plan === 'yearly' ? n * 12 : n;
    const target = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(Number(m[3]), lastDay));
    return target.toISOString().slice(0, 10);
  }
  function planOf(license) { if (!license) return null; if (PLANS.includes(license.plan)) return license.plan; return license.type === 'term' ? 'custom' : 'staff'; }
  function buildPayload(input) {
    const issuedAt = input.issuedAt || new Date().toISOString().slice(0, 10);
    const plan = PLANS.includes(input.plan) ? input.plan : input.type === 'lifetime' ? 'staff' : input.type === 'term' || input.expiresAt ? 'custom' : 'yearly';
    const type = plan === 'staff' ? 'lifetime' : 'term';
    let expiresAt = null;
    if (plan === 'monthly' || plan === 'yearly') expiresAt = input.expiresAt || addPeriod(input.startsAt || issuedAt, plan, input.periods);
    else if (plan === 'custom') expiresAt = input.expiresAt || null;
    const payload = {
      v: 1, id: input.id || crypto.randomUUID(), product: PRODUCT, type, plan,
      licensee: { name: String(input.licensee?.name || '').trim(), org: String(input.licensee?.org || '').trim(), email: String(input.licensee?.email || '').trim() },
      issuedAt,
      expiresAt,
      seats: Number.isFinite(Number(input.seats)) && Number(input.seats) >= 0 ? Math.floor(Number(input.seats)) : 0,
      machineId: input.machineId ? String(input.machineId).trim().toUpperCase() : null,
      features: normalizeFeatures(input.features),
      notes: String(input.notes || ''),
    };
    if (!payload.licensee.name && !payload.licensee.org) throw new Error('licensee name or organisation is required');
    if (type === 'term' && !/^\d{4}-\d{2}-\d{2}$/.test(payload.expiresAt || '')) throw new Error('term licenses need expiresAt (YYYY-MM-DD)');
    return payload;
  }
  async function issueLicense(input, privatePem) {
    const payload = buildPayload(input);
    const data = te.encode(canonical(payload));
    const sig = await sign(seedFromPrivatePem(privatePem), data);
    return { key: `${PREFIX}.${b64uEncode(data)}.${b64uEncode(sig)}`, payload };
  }
  function parseLicense(key) {
    const parts = String(key || '').replace(/\s+/g, '').split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) throw new Error('malformed');
    const data = b64uDecode(parts[1]); const signature = b64uDecode(parts[2]);
    return { payload: JSON.parse(td.decode(data)), data, signature };
  }
  async function verifyLicense(key, publicPem, opts = {}) {
    const result = { valid: false, reason: null, license: null, daysLeft: null };
    let parsed; try { parsed = parseLicense(key); } catch { result.reason = 'malformed'; return result; }
    result.license = parsed.payload;
    const ok = await verify(pubFromPublicPem(publicPem), te.encode(canonical(parsed.payload)), parsed.signature);
    if (!ok) { result.reason = 'bad_signature'; return result; }
    const p = parsed.payload;
    if (p.product !== PRODUCT || p.v !== 1) { result.reason = 'wrong_product'; return result; }
    if (p.machineId && opts.machineId && p.machineId !== opts.machineId) { result.reason = 'machine_mismatch'; return result; }
    if (p.type === 'term') { const exp = new Date(p.expiresAt + 'T23:59:59Z'); const now = opts.now || new Date(); result.daysLeft = Math.ceil((exp - now) / 86400000); if (now > exp) { result.reason = 'expired'; return result; } }
    result.valid = true; return result;
  }
  const lib = { PREFIX, PRODUCT, MODULES, PLANS, addPeriod, planOf, canonical, b64uEncode, b64uDecode, pemToDer, seedFromPrivatePem, pubFromPublicPem, publicPemFromRaw, publicKeyFromSeed, sign, verify, signFallback, verifyFallback, webCryptoSupported, buildPayload, issueLicense, parseLicense, verifyLicense, normalizeFeatures, useWebCrypto: true };
  return lib;
});
