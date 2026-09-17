#!/usr/bin/env node
/** Syntax-checks every CommonJS file of the main process, the tools and the tests with `node --check`. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') walk(p); }
    else if (/\.(c?js|mjs)$/.test(e.name)) files.push(p);
  }
}
for (const d of ['src/main', 'scripts', 'tools', 'test']) walk(path.join(ROOT, d));
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.error(`SYNTAX ERROR in ${path.relative(ROOT, f)}\n${r.stderr}`); }
}
console.log(`${files.length - failed}/${files.length} files pass node --check`);
process.exit(failed ? 1 : 0);
