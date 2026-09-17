'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Store } = require('../src/main/services/store');
const { tmpDir, rm } = require('./helpers');

test('store writes one JSON file per record and reads it back', () => {
  const dir = tmpDir();
  try {
    const s = new Store(dir);
    const rec = s.put('users', { id: 'u1', username: 'ali' });
    assert.equal(rec.id, 'u1');
    assert.ok(rec.createdAt && rec.updatedAt);
    assert.ok(fs.existsSync(path.join(dir, 'users', 'u1.json')));
    assert.equal(s.get('users', 'u1').username, 'ali');
    assert.equal(s.list('users').length, 1);
    assert.equal(s.count('users'), 1);
    assert.equal(s.remove('users', 'u1'), true);
    assert.equal(s.get('users', 'u1'), null);
    assert.equal(s.list('users').length, 0);
  } finally { rm(dir); }
});

test('store picks up records written by another process (shared folder scenario)', () => {
  const dir = tmpDir();
  try {
    const a = new Store(dir); const b = new Store(dir);
    a.put('attempts', { id: 'at1', score: 5 });
    assert.equal(b.list('attempts').length, 1);
    b.put('attempts', { id: 'at2', score: 7 });
    assert.equal(a.list('attempts').map(r => r.id).sort().join(','), 'at1,at2');
    // external modification is detected via mtime/size
    const f = path.join(dir, 'attempts', 'at1.json');
    const rec = JSON.parse(fs.readFileSync(f, 'utf8')); rec.score = 99; fs.writeFileSync(f, JSON.stringify(rec, null, 1) + '\n\n');
    assert.equal(a.list('attempts').find(r => r.id === 'at1').score, 99);
  } finally { rm(dir); }
});

test('store rejects unsafe ids and collections', () => {
  const dir = tmpDir();
  try {
    const s = new Store(dir);
    assert.throws(() => s.get('users', '../x'));
    assert.throws(() => s.list('../etc'));
    s.setMeta('schemaVersion', 3);
    assert.equal(s.getMeta('schemaVersion'), 3);
    assert.equal(s.getMeta('missing', 'dflt'), 'dflt');
  } finally { rm(dir); }
});
