'use strict';
/**
 * Automatic updates via electron-updater.
 * Feed: GitHub Releases of the repository configured in electron-builder.yml (publish.provider = github), or a
 * generic HTTPS folder when settings.updateFeedUrl is set (must contain latest.yml + the installer).
 * Flow: check -> "update available" notification in the UI -> user clicks download -> progress -> restart & install.
 */
const { app } = require('electron');
const log = require('electron-log');

class Updater {
  constructor(getWindow, settings) {
    this.getWindow = getWindow;
    this.settings = settings;
    this.state = { status: 'idle', version: null, progress: null, error: null, currentVersion: app.getVersion(), enabled: app.isPackaged };
    this.autoUpdater = null;
  }

  init() {
    if (!app.isPackaged) { this.state.status = 'disabled-dev'; return; }
    try {
      const { autoUpdater } = require('electron-updater');
      this.autoUpdater = autoUpdater;
      autoUpdater.logger = log;
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.allowPrerelease = false;
      const feed = this.settings.get('updateFeedUrl');
      if (feed) autoUpdater.setFeedURL({ provider: 'generic', url: feed });
      autoUpdater.on('checking-for-update', () => this.emit({ status: 'checking' }));
      autoUpdater.on('update-available', info => this.emit({ status: 'available', version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null, releaseDate: info.releaseDate }));
      autoUpdater.on('update-not-available', info => this.emit({ status: 'up-to-date', version: info.version }));
      autoUpdater.on('download-progress', p => this.emit({ status: 'downloading', progress: { percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond } }));
      autoUpdater.on('update-downloaded', info => this.emit({ status: 'downloaded', version: info.version }));
      autoUpdater.on('error', err => this.emit({ status: 'error', error: String(err && err.message || err) }));
      if (this.settings.get('autoCheckUpdates') !== false) setTimeout(() => this.check().catch(() => {}), 8000);
      setInterval(() => { if (this.settings.get('autoCheckUpdates') !== false) this.check().catch(() => {}); }, 6 * 3600 * 1000);
    } catch (err) {
      log.error('updater init failed', err);
      this.state.status = 'error'; this.state.error = String(err.message || err);
    }
  }

  emit(patch) {
    this.state = { ...this.state, error: null, ...patch };
    const win = this.getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('updater:event', this.state);
  }

  async check() {
    if (!this.autoUpdater) return this.state;
    try { await this.autoUpdater.checkForUpdates(); } catch (err) { this.emit({ status: 'error', error: String(err.message || err) }); }
    return this.state;
  }
  async download() {
    if (!this.autoUpdater) return this.state;
    try { await this.autoUpdater.downloadUpdate(); } catch (err) { this.emit({ status: 'error', error: String(err.message || err) }); }
    return this.state;
  }
  install() {
    if (!this.autoUpdater) return this.state;
    setImmediate(() => this.autoUpdater.quitAndInstall(false, true));
    return this.state;
  }
}

module.exports = { Updater };
