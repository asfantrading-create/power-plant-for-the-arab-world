'use strict';
const { app, BrowserWindow, Menu, shell, session, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const log = require('electron-log');

const { Settings } = require('./services/settings');
const { Store } = require('./services/store');
const { Auth } = require('./services/auth');
const { Exams } = require('./services/exams');
const license = require('./services/license');
const licenseKeys = require('./services/license-keys');
const { getMachineId } = require('./services/machine-id');
const { Updater } = require('./services/updater');
const ipc = require('./ipc');

log.transports.file.level = 'info';
log.info(`Arab Power Twin ${app.getVersion()} starting (${process.platform} ${process.arch}, packaged=${app.isPackaged})`);

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.asfantrading.arabpowertwin');

const APP_ROOT = app.getAppPath();
const settings = new Settings(path.join(app.getPath('userData'), 'settings.json'));
if (!settings.get('installId')) settings.set('installId', require('node:crypto').randomUUID());

// ---------- clock guard (prevents rolling back the clock to extend term licenses) ----------
const now = Date.now();
const lastRun = settings.get('lastRunAt') ? Date.parse(settings.get('lastRunAt')) : 0;
let clockTampered = false;
if (lastRun && now < lastRun - 24 * 3600 * 1000) { clockTampered = true; log.warn('system clock is earlier than the last recorded run; term licenses are suspended'); }
else settings.set('lastRunAt', new Date(now).toISOString());
setInterval(() => { const t = Date.now(); if (t > Date.parse(settings.get('lastRunAt') || 0)) settings.set('lastRunAt', new Date(t).toISOString()); }, 10 * 60 * 1000);

// ---------- static data ----------
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(APP_ROOT, rel), 'utf8')); }
const plantsFile = readJson('data/plants.json');
const dataset = { plants: plantsFile.plants, countries: readJson('data/countries.json'), complexes: readJson('data/complexes.json'), technologies: readJson('data/technologies.json'), generatedAt: plantsFile.generatedAt, sources: plantsFile.sources };
const bank = readJson('data/questions.json');
const map = readJson('data/arab-map.json');

// ---------- workspace ----------
let store, auth, exams, workspaceError = null;
function defaultWorkspace() { return path.join(app.getPath('userData'), 'workspace'); }
function initWorkspace() {
  const wanted = settings.get('workspaceDir') || defaultWorkspace();
  workspaceError = null;
  try { store = new Store(wanted); }
  catch (err) {
    workspaceError = `${wanted}: ${err.message}`;
    log.error('workspace unavailable, falling back to local', err);
    store = new Store(defaultWorkspace());
  }
  auth = new Auth(store);
  exams = new Exams(store, bank, dataset);
  return store.dir;
}
initWorkspace();

// ---------- license ----------
const machineId = getMachineId();
const userLicenseFile = () => path.join(app.getPath('userData'), 'license.key');
function readLicenseKey() {
  const candidates = [userLicenseFile(), path.join(store.dir, 'license.key')];
  for (const f of candidates) { try { if (fs.existsSync(f)) return { key: fs.readFileSync(f, 'utf8').trim(), source: f }; } catch { /* next */ } }
  return null;
}
function publicKeys() { return [licenseKeys.PRODUCTION_PUBLIC_KEY_PEM, app.isPackaged ? null : licenseKeys.DEV_PUBLIC_KEY_PEM]; }
function licenseStatus() {
  const found = readLicenseKey();
  if (!found) return { valid: false, reason: 'missing', license: null, daysLeft: null, machineId, source: null, devKeysAccepted: !app.isPackaged, productionKeyConfigured: !!licenseKeys.PRODUCTION_PUBLIC_KEY_PEM };
  const res = license.verify(found.key, { publicKeyPems: publicKeys(), machineId, clockTampered });
  return { ...res, machineId, source: found.source, devKeysAccepted: !app.isPackaged, productionKeyConfigured: !!licenseKeys.PRODUCTION_PUBLIC_KEY_PEM };
}
function activateLicense(key) {
  const res = license.verify(String(key || ''), { publicKeyPems: publicKeys(), machineId, clockTampered });
  if (res.valid) { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(userLicenseFile(), String(key).trim() + '\n', 'utf8'); }
  return { ...res, machineId };
}
function removeLicense() { try { fs.unlinkSync(userLicenseFile()); } catch { /* none */ } }

// ---------- window ----------
let win = null;
const updater = new Updater(() => win, settings);

function bootstrap() {
  return {
    version: app.getVersion(), platform: process.platform, isPackaged: app.isPackaged, machineId,
    userDataPath: app.getPath('userData'), workspaceDir: store.dir, workspaceError,
    settings: settings.all(), license: licenseStatus(), needsSetup: !auth.hasSuperAdmin(), currentUser: auth.current(),
    updater: updater.state, datasetGeneratedAt: dataset.generatedAt, plantCount: dataset.plants.length,
  };
}

function setWorkspaceDir(dir) {
  const target = dir ? String(dir) : null;
  if (target) fs.mkdirSync(target, { recursive: true });
  settings.set('workspaceDir', target);
  auth.logout();
  initWorkspace();
  if (win && !win.isDestroyed()) win.webContents.send('workspace:changed', { dir: store.dir, error: workspaceError });
  return settings.all();
}

function createWindow() {
  const bounds = settings.get('windowBounds') || {};
  win = new BrowserWindow({
    width: bounds.width || 1440, height: bounds.height || 900, x: bounds.x, y: bounds.y,
    minWidth: 1024, minHeight: 680, show: false, backgroundColor: '#0b1620',
    title: 'Arab Power Twin', icon: path.join(APP_ROOT, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, webgl: true },
  });
  win.once('ready-to-show', () => { win.show(); if (bounds.maximized) win.maximize(); });
  win.on('close', () => { try { const b = win.getNormalBounds(); settings.set('windowBounds', { ...b, maximized: win.isMaximized() }); } catch { /* ignore */ } });
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(APP_ROOT, 'src', 'renderer', 'index.html'));
}

function buildMenu() {
  const isDev = !app.isPackaged;
  const template = [
    { label: 'Arab Power Twin', submenu: [{ role: 'reload', label: 'إعادة تحميل / Reload' }, { type: 'separator' }, { role: 'quit', label: 'خروج / Quit' }] },
    { label: 'عرض / View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, ...(isDev ? [{ role: 'toggleDevTools' }] : [])] },
    { label: 'مساعدة / Help', submenu: [
      { label: 'الدليل / User guide (GitHub)', click: () => shell.openExternal('https://github.com/asfantrading-create/power-plant-for-the-arab-world#readme') },
      { label: 'التحقق من التحديثات / Check for updates', click: () => updater.check() },
      { label: 'حول / About', click: () => dialog.showMessageBox(win, { type: 'info', title: 'Arab Power Twin', message: `Arab Power Twin ${app.getVersion()}`, detail: `التوأم الرقمي لمحطات الطاقة في الوطن العربي\nMachine ID: ${machineId}\nWorkspace: ${store.dir}\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}` }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ipc.register({
    log, settings, getWindow: () => win, store: () => store, auth: () => auth, exams: () => exams,
    dataset, map, bank, updater, bootstrap, licenseStatus, activateLicense, removeLicense, setWorkspaceDir,
    get workspaceError() { return workspaceError; },
  });
  buildMenu();
  createWindow();
  updater.init();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { app.quit(); });
process.on('uncaughtException', err => { log.error('uncaught', err); });
