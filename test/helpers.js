'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function tmpDir(prefix = 'apt-test-') { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function rm(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
const ROOT = path.resolve(__dirname, '..');
function loadDataset() {
  const plants = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/plants.json'), 'utf8'));
  return { plants: plants.plants, countries: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/countries.json'), 'utf8')), complexes: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/complexes.json'), 'utf8')), technologies: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/technologies.json'), 'utf8')) };
}
function loadBank() { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/questions.json'), 'utf8')); }
module.exports = { tmpDir, rm, ROOT, loadDataset, loadBank };
