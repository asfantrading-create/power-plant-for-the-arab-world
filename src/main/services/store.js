'use strict';
/**
 * Record store: one JSON file per record inside <workspace>/<collection>/.
 * Designed so several PCs (e.g. a university lab) can point at the same shared folder:
 * every write is atomic (temp file + rename) and records never share a file, so
 * concurrent writers cannot corrupt each other. Reads re-scan the directory, honouring mtimes.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const COLLECTIONS = ['users', 'groups', 'exams', 'attempts', 'audit', 'sessions', 'meta'];

class Store {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map(); // collection -> Map(id -> {mtimeMs, record})
    this.ensure();
  }

  ensure() {
    fs.mkdirSync(this.dir, { recursive: true });
    for (const c of COLLECTIONS) fs.mkdirSync(path.join(this.dir, c), { recursive: true });
  }

  static newId(prefix = '') {
    const t = Date.now().toString(36);
    return `${prefix}${t}-${crypto.randomBytes(5).toString('hex')}`;
  }

  collectionDir(collection) {
    if (!/^[a-z]+$/.test(collection)) throw new Error('invalid collection');
    const d = path.join(this.dir, collection);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  filePath(collection, id) {
    if (!/^[A-Za-z0-9_.-]+$/.test(id)) throw new Error('invalid id');
    return path.join(this.collectionDir(collection), `${id}.json`);
  }

  list(collection) {
    const dir = this.collectionDir(collection);
    const map = this.cache.get(collection) || new Map();
    const present = new Set();
    let names = [];
    try { names = fs.readdirSync(dir); } catch { names = []; }
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const id = name.slice(0, -5);
      present.add(id);
      const full = path.join(dir, name);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      const cached = map.get(id);
      if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) continue;
      try {
        const record = JSON.parse(fs.readFileSync(full, 'utf8'));
        map.set(id, { mtimeMs: st.mtimeMs, size: st.size, record });
      } catch (err) {
        // A writer on another machine may be mid-rename; skip this pass.
        if (!cached) continue;
      }
    }
    for (const id of [...map.keys()]) if (!present.has(id)) map.delete(id);
    this.cache.set(collection, map);
    return [...map.values()].map(v => v.record);
  }

  get(collection, id) {
    const full = this.filePath(collection, id);
    try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch { return null; }
  }

  put(collection, record) {
    if (!record || typeof record !== 'object') throw new Error('record must be an object');
    if (!record.id) record.id = Store.newId();
    record.updatedAt = new Date().toISOString();
    if (!record.createdAt) record.createdAt = record.updatedAt;
    const full = this.filePath(collection, record.id);
    const tmp = `${full}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(record, null, 1), 'utf8');
    fs.renameSync(tmp, full);
    const map = this.cache.get(collection);
    if (map) { const st = fs.statSync(full); map.set(record.id, { mtimeMs: st.mtimeMs, size: st.size, record }); }
    return record;
  }

  remove(collection, id) {
    const full = this.filePath(collection, id);
    try { fs.unlinkSync(full); } catch { return false; }
    const map = this.cache.get(collection);
    if (map) map.delete(id);
    return true;
  }

  find(collection, predicate) {
    return this.list(collection).filter(predicate);
  }

  count(collection) {
    return this.list(collection).length;
  }

  /** Simple key/value metadata (e.g. schema version, institution name). */
  getMeta(key, fallback = null) {
    const r = this.get('meta', key);
    return r ? r.value : fallback;
  }
  setMeta(key, value) {
    return this.put('meta', { id: key, value });
  }
}

module.exports = { Store, COLLECTIONS };
