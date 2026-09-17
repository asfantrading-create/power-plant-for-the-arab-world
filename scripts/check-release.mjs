#!/usr/bin/env node
/** Pre-release guard: refuses to build a public installer that cannot verify real licenses. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keys = require(path.join(ROOT, 'src/main/services/license-keys.js'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
let ok = true;
if (!keys.PRODUCTION_PUBLIC_KEY_PEM) {
  console.error('✖ PRODUCTION_PUBLIC_KEY_PEM is not configured. Run `npm run license -- keygen` on the vendor machine, commit src/main/services/license-keys.js and tag again.');
  ok = false;
} else console.log('✔ production license public key embedded');
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) { console.error('✖ package.json version must be semver (x.y.z):', pkg.version); ok = false; } else console.log('✔ version', pkg.version);
for (const f of ['data/plants.json', 'data/questions.json', 'data/arab-map.json', 'build/icon.ico', 'build/license.txt']) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.error('✖ missing', f); ok = false; }
}
if (process.env.ALLOW_DEV_KEY_RELEASE === '1' && !keys.PRODUCTION_PUBLIC_KEY_PEM) { console.warn('! ALLOW_DEV_KEY_RELEASE=1: building a TEST installer that accepts no license (dev keys are ignored in packaged builds).'); ok = true; }
process.exit(ok ? 0 : 1);
