'use strict';
/** Per-installation settings (userData/settings.json): workspace path, language, update options, clock guard. */
const fs = require('node:fs');
const path = require('node:path');

const DEFAULTS = {
  language: 'ar',
  theme: 'dark',
  workspaceDir: null,          // null => <userData>/workspace ; can be a shared network folder (UNC path)
  updateFeedUrl: null,         // null => GitHub Releases feed baked in at build time (electron-builder publish config)
  autoCheckUpdates: true,
  lastRunAt: null,
  installId: null,
  windowBounds: null,
  institutionName: '',
};

class Settings {
  constructor(file) {
    this.file = file;
    this.data = { ...DEFAULTS };
    this.load();
  }
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...DEFAULTS, ...raw };
    } catch { this.data = { ...DEFAULTS }; }
    return this.data;
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
  get(key) { return this.data[key]; }
  set(key, value) {
    if (!(key in DEFAULTS)) throw new Error('unknown setting: ' + key);
    this.data[key] = value;
    this.save();
    return this.data;
  }
  all() { return { ...this.data }; }
}

module.exports = { Settings, DEFAULTS };
