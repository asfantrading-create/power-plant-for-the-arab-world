'use strict';
/**
 * End-to-end smoke test without Electron: the real renderer bundle runs inside jsdom and talks to the real
 * IPC handlers (src/main/ipc) through a fake `window.api`, backed by real services on a temporary workspace.
 * Three.js (WebGL) pages are skipped; Chart.js gets a no-op 2D context.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { tmpDir, rm, ROOT, loadDataset, loadBank } = require('./helpers');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { JSDOM = null; }
const BUNDLE = path.join(ROOT, 'src/renderer/dist/bundle.js');
const skip = !JSDOM || !fs.existsSync(BUNDLE);

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
  const updater = { state: { status: 'disabled-dev', currentVersion: '1.0.0' }, check() { return this.state; }, download() { return this.state; }, install() { return this.state; } };
  const licenseStatus = () => licenseKey ? { ...license.verify(licenseKey, { publicKeyPems: [keys.publicKeyPem] }), machineId: 'APT-TEST', source: 'memory', devKeysAccepted: true, productionKeyConfigured: true } : { valid: false, reason: 'missing', license: null, daysLeft: null, machineId: 'APT-TEST', source: null, devKeysAccepted: true, productionKeyConfigured: true };
  const ctx = {
    log: { warn() {}, info() {}, error() {} }, settings, getWindow: () => null, store: () => store, auth: () => auth, exams: () => exams, dataset, map, bank, updater,
    bootstrap: () => ({ version: '1.0.0', platform: 'test', isPackaged: false, machineId: 'APT-TEST', userDataPath: workspace, workspaceDir: workspace, workspaceError: null, settings: settings.all(), license: licenseStatus(), needsSetup: !auth.hasSuperAdmin(), currentUser: auth.current(), updater: updater.state, datasetGeneratedAt: '2026-09-17', plantCount: dataset.plants.length }),
    licenseStatus, activateLicense: key => { const r = license.verify(key, { publicKeyPems: [keys.publicKeyPem] }); if (r.valid) licenseKey = key; return { ...r, machineId: 'APT-TEST' }; }, removeLicense: () => { licenseKey = null; }, setWorkspaceDir: () => settings.all(), workspaceError: null,
  };
  const handlers = {};
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === 'electron') return { ipcMain: { handle(ch, fn) { handlers[ch] = fn; } }, shell: { openExternal() {}, showItemInFolder() {} }, dialog: { showOpenDialog: async () => ({ canceled: true }), showSaveDialog: async () => ({ canceled: true }) }, BrowserWindow: class {}, app: { getPath: () => workspace, getVersion: () => '1.0.0', isPackaged: false } };
    return orig.call(this, req, ...rest);
  };
  try { delete require.cache[require.resolve('../src/main/ipc/index.js')]; delete require.cache[require.resolve('../src/main/services/exporter.js')]; require('../src/main/ipc/index.js').register(ctx); } finally { Module._load = orig; }
  const validKey = license.issue({ licensee: { name: 'Smoke Tester', org: 'Test University' }, type: 'lifetime', seats: 10 }, keys.privateKeyPem);
  return { handlers, validKey, auth, store, exams };
}

function makeWindow(handlers) {
  const html = fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf8').replace(/<script[^>]*><\/script>/, '').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only', url: 'file:///app/index.html' });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', e => errors.push(e.error || e.message));
  window.__errors = errors;
  window.api = {
    invoke: async (channel, payload) => { const fn = handlers[channel]; if (!fn) return { ok: false, error: 'no_handler:' + channel }; return fn({}, payload); },
    on: () => () => {},
  };
  // Chart.js: no-op 2D context; three.js pages are not visited.
  const noop = new Proxy({}, { get: (_, p) => (p === 'measureText' ? () => ({ width: 10 }) : p === 'getImageData' ? () => ({ data: [] }) : p === 'createLinearGradient' ? () => ({ addColorStop() {} }) : typeof p === 'string' ? () => noop : undefined), set: () => true });
  window.HTMLCanvasElement.prototype.getContext = function (type) { return type === '2d' ? noop : null; }; // no WebGL in jsdom
  window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.eval(fs.readFileSync(BUNDLE, 'utf8'));
  return { dom, window };
}
const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
async function settle(window, ms = 250) { await tick(ms); }
async function goto(window, hash, ms = 300) { window.location.hash = hash; await settle(window, ms); }
const text = window => window.document.body.textContent;

test('renderer boots through activation, setup, login and renders every non-WebGL page without errors', { skip }, async () => {
  const ws = tmpDir();
  try {
    const { handlers, validKey, auth, store } = buildMainContext(ws);
    const { window } = makeWindow(handlers);
    const doc = window.document;
    await settle(window, 400);
    // 1. activation screen
    assert.ok(doc.querySelector('.auth-card'), 'activation card shown');
    assert.match(text(window), /تفعيل الترخيص/);
    doc.querySelector('.auth-card textarea').value = validKey;
    doc.querySelector('.auth-card .btn.primary').click();
    await settle(window, 400);
    // 2. setup screen
    assert.match(text(window), /الإعداد الأولي/, 'setup screen after activation');
    const inputs = doc.querySelectorAll('.auth-card input');
    inputs[0].value = 'Test University'; inputs[1].value = 'prof'; inputs[2].value = 'Prof. Test'; inputs[3].value = 'pass1234'; inputs[4].value = 'pass1234';
    doc.querySelector('.auth-card button[type=submit]').click();
    await settle(window, 600);
    // 3. shell + dashboard
    assert.ok(doc.querySelector('.shell'), 'shell rendered: ' + text(window).slice(0, 200));
    assert.match(text(window), /مرحباً Prof\. Test/);
    assert.ok(doc.querySelectorAll('.stat').length >= 4);
    // seed data through the real services: a group, a student, an exam, an attempt
    const g = store.put('groups', { id: 'g-ee', name: 'EE401' });
    const st = auth.createUser({ username: 'stud01', password: 'student123', displayName: 'Student One', role: 'student', groupId: g.id });
    const exams = handlers['exams:create'] ? null : null; void exams;
    const created = await handlers['exams:create']({}, { title: 'Midterm', titleAr: 'اختبار نصفي', topics: ['general', 'pv'], questionCount: 8, generatedShare: 0.5, durationMinutes: 20, passMark: 50, maxAttempts: 2 });
    assert.equal(created.ok, true, JSON.stringify(created));
    // 4. visit pages as superadmin
    const pages = ['#/plants', '#/plants?country=EGY&fuel=Solar', `#/plant/are-barakah`, '#/exams', '#/practice', '#/practice?plantId=are-barakah', '#/results', '#/profile', '#/about', '#/admin/users', '#/admin/groups', '#/admin/exams', '#/admin/results', '#/admin/sessions', '#/admin/license', '#/admin/settings', '#/admin/updates', '#/admin/workspace', '#/admin/audit'];
    for (const p of pages) {
      await goto(window, p, 450);
      assert.equal(window.__errors.length, 0, `errors on ${p}: ${window.__errors.map(e => e && e.stack || e).join('\n')}`);
      assert.ok(!doc.querySelector('.content .alert.error'), `error alert on ${p}: ${doc.querySelector('.content .alert.error')?.textContent}`);
      assert.ok(doc.querySelector('.content').textContent.trim().length > 20, `empty page ${p}`);
      if (p === '#/plants') assert.ok(doc.querySelectorAll('.explorer table.table tbody tr').length > 5, 'explorer lists plants');
      if (p === '#/plants?country=EGY&fuel=Solar') assert.ok([...doc.querySelectorAll('.explorer table.table tbody tr')].every(tr => /🇪🇬/.test(tr.textContent)), 'country filter applied');
    }
    await goto(window, '#/plant/are-barakah', 400);
    assert.match(text(window), /براكة/);
    assert.match(text(window), /5,600/);
    // 5. language switch to English re-renders
    const enBtn = [...doc.querySelectorAll('.topbar .btn-group button')].find(b => b.textContent === 'English');
    enBtn.click(); await settle(window, 500);
    assert.equal(doc.documentElement.dir, 'ltr');
    assert.match(text(window), /Barakah Nuclear Energy Plant/);
    // 6. student flow: logout, login, start exam, answer, submit, see result
    const logout = [...doc.querySelectorAll('.sidebar nav a')].find(a => /Sign out|تسجيل الخروج/.test(a.textContent));
    logout.click(); await settle(window, 400);
    assert.ok(doc.querySelector('.auth-card'), 'login screen after logout');
    const li = doc.querySelectorAll('.auth-card input'); li[0].value = 'stud01'; li[1].value = 'student123';
    doc.querySelector('.auth-card button[type=submit]').click(); await settle(window, 600);
    assert.ok(doc.querySelector('.shell'), 'student shell');
    assert.ok(![...doc.querySelectorAll('.sidebar nav a')].some(a => /Users|المستخدمون/.test(a.textContent)), 'student has no admin nav');
    await goto(window, '#/exams', 400);
    assert.match(text(window), /Midterm|اختبار نصفي/);
    // start exam programmatically through the same API the button uses, then render the runner
    const started = await window.api.invoke('attempts:start', { examId: created.data.id });
    assert.equal(started.ok, true, JSON.stringify(started));
    await goto(window, `#/exam/${started.data.id}`, 500);
    assert.ok(doc.querySelector('.exam-run'), 'exam runner rendered');
    assert.ok(doc.querySelectorAll('.qnav button').length === 8);
    assert.ok(!text(window).includes('correct'), 'no answers leaked');
    for (let i = 0; i < 8; i++) { doc.querySelectorAll('.qnav button')[i].click(); await tick(30); doc.querySelector('.question .option').click(); await tick(30); }
    const submitted = await window.api.invoke('attempts:submit', { attemptId: started.data.id, answers: new Array(8).fill(0) });
    assert.equal(submitted.ok, true);
    await goto(window, `#/result/${started.data.id}`, 500);
    assert.ok(doc.querySelector('.score-ring'), 'result page shows score ring');
    assert.ok(doc.querySelectorAll('.question').length === 8, 'review lists all questions');
    await goto(window, '#/results', 400);
    assert.match(text(window), /Midterm|اختبار نصفي/);
    assert.equal(window.__errors.length, 0, window.__errors.map(e => e && e.stack || e).join('\n'));
    // 7. dashboard for student works too
    await goto(window, '#/dashboard', 400);
    assert.ok(doc.querySelectorAll('.stat').length >= 4);
    assert.equal(window.__errors.length, 0);
    // 8. digital twin page: WebGL is unavailable in jsdom, so the 3D scene fails gracefully while the
    //    simulation loop, gauges, unit list, controls and charts keep working.
    for (const id of ['are-barakah', 'sau-dumat-al-jandal-wind', 'are-al-dhafra-pv', 'gppd-WRI1000106', 'egy-beni-suef-ccgt']) {
      await goto(window, `#/twin/${id}`, 1200);
      assert.ok(doc.querySelector('.twin'), 'twin layout for ' + id);
      assert.ok(doc.querySelectorAll('.gauge').length >= 4, 'gauges for ' + id);
      assert.ok(doc.querySelectorAll('.unit-row').length >= 1, 'unit rows for ' + id);
      assert.ok(doc.querySelectorAll('.ctl input[type=range]').length >= 2, 'controls for ' + id);
      const out = doc.querySelector('.gauge b').textContent;
      assert.ok(/\d/.test(out), 'output gauge has a number: ' + out);
      const chip = doc.querySelector('.chip-list .chip'); if (chip) chip.click(); await tick(400);
      assert.equal(window.__errors.length, 0, `twin errors on ${id}: ${window.__errors.map(e => e && e.stack || e).join('\n')}`);
    }
    await goto(window, '#/dashboard', 300);
    assert.equal(window.__errors.length, 0);
    window.close();
  } finally { rm(ws); }
});
