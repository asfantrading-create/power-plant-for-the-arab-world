#!/usr/bin/env node
/**
 * Vendor license tool (run by the SELLER, never shipped to customers).
 *
 *   npm run license -- keygen [--force]
 *       Generates the production Ed25519 key pair. Private key -> tools/license-cli/keys/vendor-private.pem (git-ignored,
 *       BACK IT UP!). Public key is written into src/main/services/license-keys.js so the next build accepts your licenses.
 *   npm run license -- issue --name "Prof. Ahmed" --org "King Saud University" --email a@ksu.edu.sa \
 *                          [--plan monthly|yearly|custom|staff (default yearly)] [--periods N (months or years, default 1)] [--start YYYY-MM-DD] \
 *                          [--expires YYYY-MM-DD (plan custom)] [--seats 40 (0 = unlimited)] [--machine APT-XXXX-XXXX-XXXX-XXXX] \
 *                          [--modules twin,exams] [--technologies pv,wind_onshore,...] [--notes "..."] [--out license.lic] [--dev]
 *       Plans: monthly / yearly subscriptions for customers (expiry computed from the start date, default today);
 *       custom = explicit expiry date; staff = internal license for the vendor's own employees that never expires
 *       (never sell it – the customer-facing app never shows an unlimited option).
 *       (a browser-based alternative lives in tools/license-generator/index.html)
 *       Prints (and optionally writes) a license key for a customer.
 *   npm run license -- verify <key-or-file> [--machine APT-...] [--dev]
 *   npm run license -- dev-keygen      (development key pair, accepted only by unpackaged builds)
 *   npm run license -- info            (shows which public keys are configured)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lic = require(path.join(ROOT, 'src/main/services/license.js'));
const KEYS_JS = path.join(ROOT, 'src/main/services/license-keys.js');
const GENERATOR_HTML = path.join(ROOT, 'tools/license-generator/index.html');
const PROD_DIR = path.join(ROOT, 'tools/license-cli/keys');
const DEV_DIR = path.join(ROOT, 'tools/license-cli/dev-keys');
const PROD_PRIV = path.join(PROD_DIR, 'vendor-private.pem');
const DEV_PRIV = path.join(DEV_DIR, 'dev-private.pem');

function args() {
  const a = process.argv.slice(2);
  const cmd = a.shift();
  const opts = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; opts[k] = v; }
    else opts._.push(a[i]);
  }
  return { cmd, opts };
}

function readKeysJs() { delete require.cache[KEYS_JS]; return require(KEYS_JS); }
function writeKeysJs({ prod, dev }) {
  const cur = readKeysJs();
  const P = prod === undefined ? cur.PRODUCTION_PUBLIC_KEY_PEM : prod;
  const D = dev === undefined ? cur.DEV_PUBLIC_KEY_PEM : dev;
  const src = fs.readFileSync(KEYS_JS, 'utf8');
  const header = src.slice(0, src.indexOf('module.exports'));
  const body = `module.exports = {\n  PRODUCTION_PUBLIC_KEY_PEM: ${P ? JSON.stringify(P) : 'null'},\n  DEV_PUBLIC_KEY_PEM: ${D ? JSON.stringify(D) : 'null'},\n};\n`;
  fs.writeFileSync(KEYS_JS, header + body);
  // keep the browser license generator's embedded verification key in sync with the production key
  if (P && fs.existsSync(GENERATOR_HTML)) {
    const html = fs.readFileSync(GENERATOR_HTML, 'utf8');
    const stamped = html.replace(/const EMBEDDED_PUBLIC_KEY_PEM = [^;]*;/, `const EMBEDDED_PUBLIC_KEY_PEM = ${JSON.stringify(P)};`);
    if (stamped !== html) fs.writeFileSync(GENERATOR_HTML, stamped);
  }
}

function keygen(dir, file, label, force, isDev) {
  if (fs.existsSync(file) && !force) {
    console.error(`${label} private key already exists at ${file}. Use --force to overwrite (this INVALIDATES all licenses issued with the old key).`);
    process.exit(1);
  }
  fs.mkdirSync(dir, { recursive: true });
  const { publicKeyPem, privateKeyPem } = lic.generateKeyPair();
  fs.writeFileSync(file, privateKeyPem, { mode: 0o600 });
  fs.writeFileSync(file.replace('-private.pem', '-public.pem'), publicKeyPem);
  writeKeysJs(isDev ? { dev: publicKeyPem } : { prod: publicKeyPem });
  console.log(`${label} key pair generated.\n  private: ${file}\n  public : embedded in src/main/services/license-keys.js`);
  if (!isDev) console.log('\n!! Back up the private key somewhere safe. Commit license-keys.js and rebuild the installer. !!');
}

const { cmd, opts } = args();
switch (cmd) {
  case 'keygen': keygen(PROD_DIR, PROD_PRIV, 'Production', !!opts.force, false); break;
  case 'dev-keygen': keygen(DEV_DIR, DEV_PRIV, 'Development', !!opts.force, true); break;
  case 'issue': {
    const privFile = opts.dev ? DEV_PRIV : PROD_PRIV;
    if (!fs.existsSync(privFile)) { console.error(`No private key at ${privFile}. Run: npm run license -- ${opts.dev ? 'dev-keygen' : 'keygen'}`); process.exit(1); }
    const plan = opts.plan ? String(opts.plan) : opts.type === 'lifetime' ? 'staff' : opts.type === 'term' || opts.expires ? 'custom' : 'yearly';
    if (!lic.PLANS.includes(plan)) { console.error(`--plan must be one of: ${lic.PLANS.join(', ')}`); process.exit(1); }
    if (plan === 'custom' && !opts.expires) { console.error('--plan custom needs --expires YYYY-MM-DD'); process.exit(1); }
    const key = lic.issue({
      licensee: { name: opts.name || '', org: opts.org || '', email: opts.email || '' },
      plan,
      periods: opts.periods !== undefined ? Number(opts.periods) : 1,
      startsAt: opts.start || undefined,
      expiresAt: opts.expires || null,
      seats: opts.seats !== undefined ? Number(opts.seats) : 0,
      machineId: opts.machine || null,
      features: { modules: opts.modules ? String(opts.modules).split(',').map(s => s.trim()).filter(Boolean) : undefined, technologies: opts.technologies ? String(opts.technologies).split(',').map(s => s.trim()).filter(Boolean) : undefined },
      notes: opts.notes || '',
    }, fs.readFileSync(privFile, 'utf8'));
    const { payload } = lic.parse(key);
    console.log('\nLicense issued:\n' + JSON.stringify(payload, null, 2) + '\n\nKEY (give this to the customer):\n' + key + '\n');
    if (opts.out) { fs.writeFileSync(opts.out, key + '\n'); console.log('written to ' + opts.out); }
    break;
  }
  case 'verify': {
    let key = opts._[0] || '';
    if (fs.existsSync(key)) key = fs.readFileSync(key, 'utf8');
    const keys = readKeysJs();
    const res = lic.verify(key, { publicKeyPems: [keys.PRODUCTION_PUBLIC_KEY_PEM, opts.dev ? keys.DEV_PUBLIC_KEY_PEM : null], machineId: opts.machine || undefined });
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.valid ? 0 : 2);
    break;
  }
  case 'info': {
    const keys = readKeysJs();
    console.log('production public key:', keys.PRODUCTION_PUBLIC_KEY_PEM ? 'configured' : 'NOT CONFIGURED (run: npm run license -- keygen)');
    console.log('development public key:', keys.DEV_PUBLIC_KEY_PEM ? 'configured' : 'not configured');
    console.log('production private key file:', fs.existsSync(PROD_PRIV) ? PROD_PRIV : '(missing on this machine)');
    break;
  }
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
}
