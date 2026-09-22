'use strict';
/** Builds the real IPC handler table (src/main/ipc) on top of real services with a temporary workspace, no Electron. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { ROOT, loadDataset, loadBank } = require('./helpers');

function buildMainContext(workspace) {
  const { Store } = require('../src/main/services/store');
  const { Auth } = require('../src/main/services/auth');
  const { Exams } = require('../src/main/services/exams');
  const license = require('../src/main/services/license');
  const dataset = loadDataset(); const bank = loadBank();
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/arab-map.json'), 'utf8'));
  const keys = license.generateKeyPair();
  const store = new Store(workspace); const auth = new Auth(store); const exams = new Exams(store, bank, dataset);
  let licenseKey = null;
  const settings = { data: { language: 'ar', theme: 'dark', institutionName: 'Test University', workspaceDir: null, updateFeedUrl: null, autoCheckUpdates: true }, get(k) { return this.data[k]; }, set(k, v) { this.data[k] = v; return this.data; }, all() { return { ...this.data }; } };
  const updater = { state: { status: 'disabled-dev', currentVersion: '1.0.0' }, downloads: 0, installs: 0, check() { return this.state; }, download() { this.downloads++; return this.state; }, install() { this.installs++; return this.state; } };
  const licenseStatus = () => { if (!licenseKey) return { valid: false, reason: 'missing', license: null, daysLeft: null, features: null, machineId: 'APT-TEST', source: null, devKeysAccepted: true, productionKeyConfigured: true }; const r = license.verify(licenseKey, { publicKeyPems: [keys.publicKeyPem] }); return { ...r, features: r.valid ? license.featuresOf(r.license) : null, machineId: 'APT-TEST', source: 'memory', devKeysAccepted: true, productionKeyConfigured: true }; };
  exams.featuresProvider = () => { const s = licenseStatus(); return s.valid ? s.features : null; };
  const ctx = {
    log: { warn() {}, info() {}, error() {} }, settings, getWindow: () => null, store: () => store, auth: () => auth, exams: () => exams, dataset, map, bank, updater,
    bootstrap: () => ({ version: '1.0.0', platform: 'test', isPackaged: false, machineId: 'APT-TEST', userDataPath: workspace, workspaceDir: workspace, workspaceError: null, settings: settings.all(), license: licenseStatus(), needsSetup: !auth.hasSuperAdmin(), currentUser: auth.current(), updater: updater.state, datasetGeneratedAt: '2026-09-17', plantCount: dataset.plants.length }),
    licenseStatus, activateLicense: key => { const r = license.verify(key, { publicKeyPems: [keys.publicKeyPem] }); if (r.valid) licenseKey = key; return { ...r, features: r.valid ? license.featuresOf(r.license) : null, machineId: 'APT-TEST' }; }, removeLicense: () => { licenseKey = null; }, setWorkspaceDir: () => settings.all(), workspaceError: null,
  };
  const handlers = {};
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === 'electron') return { ipcMain: { handle(ch, fn) { handlers[ch] = fn; } }, shell: { openExternal() {}, showItemInFolder() {} }, dialog: { showOpenDialog: async () => ({ canceled: true }), showSaveDialog: async () => ({ canceled: true }) }, BrowserWindow: class {}, app: { getPath: () => workspace, getVersion: () => '1.0.0', isPackaged: false } };
    return orig.call(this, req, ...rest);
  };
  try { delete require.cache[require.resolve('../src/main/ipc/index.js')]; delete require.cache[require.resolve('../src/main/services/exporter.js')]; require('../src/main/ipc/index.js').register(ctx); } finally { Module._load = orig; }
  const validKey = license.issue({ licensee: { name: 'Smoke Tester', org: 'Test University' }, plan: 'yearly', seats: 10 }, keys.privateKeyPem);
  const issue = input => license.issue(input, keys.privateKeyPem);
  return { handlers, updater, validKey, auth, store, exams, issue };
}


module.exports = { buildMainContext };
