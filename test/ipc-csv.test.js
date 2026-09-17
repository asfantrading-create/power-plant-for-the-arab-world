'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../src/main/services/exporter');
const { unitLayoutSanity } = { unitLayoutSanity: null };

test('csv export escapes fields and starts with a BOM for Excel', () => {
  const csv = toCsv([{ a: 'x,y', b: 'he said "hi"', c: 5 }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"x,y"'));
  assert.ok(csv.includes('"he said ""hi"""'));
  assert.ok(csv.trim().endsWith(',5'));
});

test('student CSV parser handles headers, delimiters and quoted names', () => {
  // parseCsvText lives in the ipc module which requires electron; load it with a stub
  const Module = require('node:module');
  const orig = Module._load;
  Module._load = function (req, ...rest) { if (req === 'electron') return { ipcMain: { handle() {} }, shell: {}, dialog: {}, BrowserWindow: class {}, app: { getPath: () => '/tmp' } }; return orig.call(this, req, ...rest); };
  try {
    const { parseCsvText } = require('../src/main/ipc/index.js');
    const rows = parseCsvText('username,password,displayName,studentNumber,groupName\nali,pw123456,"Ali, Ahmed",4001,EE401\nsara;pw2;Sara;4002;EE402');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].displayName, 'Ali, Ahmed'); assert.equal(rows[0].groupName, 'EE401');
    assert.equal(rows[1].username, 'sara'); assert.equal(rows[1].studentNumber, '4002');
    const noHeader = parseCsvText('u1,p1,Name One,1,G');
    assert.equal(noHeader[0].username, 'u1'); assert.equal(noHeader[0].groupName, 'G');
  } finally { Module._load = orig; }
});
