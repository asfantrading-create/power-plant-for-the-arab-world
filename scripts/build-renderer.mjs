#!/usr/bin/env node
/** Bundles the renderer (ES modules + three.js + chart.js) into a single classic script with esbuild. */
import * as esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const outdir = path.join(ROOT, 'src/renderer/dist');
fs.mkdirSync(outdir, { recursive: true });

const options = {
  entryPoints: [path.join(ROOT, 'src/renderer/js/app.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome130'],
  outfile: path.join(outdir, 'bundle.js'),
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  legalComments: 'none',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'info',
};
if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('watching renderer…');
} else {
  const t = Date.now();
  await esbuild.build(options);
  const size = fs.statSync(options.outfile).size;
  console.log(`renderer bundle: ${(size / 1024).toFixed(0)} KB in ${Date.now() - t} ms`);
}
