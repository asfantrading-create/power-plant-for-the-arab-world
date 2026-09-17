'use strict';
/** The browser license generator page must work end-to-end in a DOM: load the private key, fill the form, produce a key the app accepts, verify it, keep a register. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const lic = require('../src/main/services/license');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch { JSDOM = null; }

const DIR = path.join(__dirname, '..', 'tools', 'license-generator');
const DEV = path.join(__dirname, '..', 'tools', 'license-cli', 'dev-keys');
const devPriv = fs.readFileSync(path.join(DEV, 'dev-private.pem'), 'utf8');
const devPub = fs.readFileSync(path.join(DEV, 'dev-public.pem'), 'utf8');

function loadPage() {
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8')
    .replace('<script src="license-crypto.js"></script>', () => '<script>' + fs.readFileSync(path.join(DIR, 'license-crypto.js'), 'utf8') + '</script>');
  assert.ok(html.includes('MCowBQYDK2VwAyEA'), 'page embeds a production public key');
  return new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost/',
    beforeParse(window) {
      Object.defineProperty(window.crypto, 'subtle', { value: nodeCrypto.webcrypto.subtle });
      window.alert = () => {}; window.confirm = () => true;
    },
  });
}

test('license generator page issues keys the app accepts', { skip: !JSDOM }, async () => {
  const dom = loadPage();
  const { window } = dom; const doc = window.document;
  await new Promise(r => setTimeout(r, 20));
  assert.equal(doc.querySelectorAll('#techs input[data-tech]').length, 16);
  assert.equal(doc.getElementById('allTechs').checked, true);
  // 1) private key
  doc.getElementById('priv').value = devPriv; await window.checkPriv();
  const status = doc.getElementById('privStatus').textContent;
  assert.match(status, /✓/); assert.match(status, /لا يطابق/, 'dev key must warn that it is not the production key');
  // 2) customer + permissions
  doc.getElementById('org').value = 'جامعة الاختبار'; doc.getElementById('name').value = 'د. اختبار'; doc.getElementById('email').value = 't@u.edu';
  doc.getElementById('type').value = 'term'; window.toggleExp(); doc.getElementById('expires').value = '2031-06-30';
  assert.equal(doc.getElementById('expRow').style.display, '');
  doc.getElementById('seats').value = '30'; doc.getElementById('machine').value = 'apt-1a2b-3c4d-5e6f-7a8b'; doc.getElementById('notes').value = 'test note';
  doc.querySelector('#modules input[data-module="exams"]').checked = false;
  doc.getElementById('allTechs').checked = false; window.toggleAllTechs();
  doc.querySelectorAll('#techs input[data-tech]').forEach(i => { i.checked = ['pv', 'ccgt'].includes(i.dataset.tech); });
  await window.generate();
  assert.equal(doc.getElementById('genError').textContent, '');
  const key = doc.getElementById('out').textContent;
  assert.ok(key.startsWith('APT1.'), key);
  assert.match(doc.getElementById('summary').textContent, /2031-06-30/);
  // 3) the app accepts it
  const res = lic.verify(key, { publicKeyPems: [devPub], machineId: 'APT-1A2B-3C4D-5E6F-7A8B', now: new Date('2031-01-01') });
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(res.license.type, 'term'); assert.equal(res.license.expiresAt, '2031-06-30'); assert.equal(res.license.seats, 30);
  assert.equal(res.license.machineId, 'APT-1A2B-3C4D-5E6F-7A8B'); assert.equal(res.license.licensee.org, 'جامعة الاختبار'); assert.equal(res.license.notes, 'test note');
  assert.deepEqual(res.license.features, { modules: ['twin'], technologies: ['ccgt', 'pv'] });
  assert.equal(lic.verify(key, { publicKeyPems: [devPub], machineId: 'APT-0000-0000-0000-0000', now: new Date('2031-01-01') }).reason, 'machine_mismatch');
  assert.equal(lic.verify(key, { publicKeyPems: [devPub], now: new Date('2031-07-01') }).reason, 'expired');
  // register row persisted in localStorage
  assert.equal(doc.querySelectorAll('#register tbody tr').length, 1);
  assert.match(doc.querySelector('#register tbody tr').textContent, /جامعة الاختبار/);
  assert.equal(JSON.parse(window.localStorage.getItem('apt.register')).length, 1);
  // verify section: pasted dev public key -> valid; embedded production key -> invalid
  doc.getElementById('verifyIn').value = key; doc.getElementById('pub').value = devPub; await window.verifyKey();
  assert.match(doc.getElementById('verifyOut').textContent, /✓/);
  doc.getElementById('pub').value = ''; await window.verifyKey();
  assert.match(doc.getElementById('verifyOut').textContent, /✗/);
  // validation
  doc.getElementById('machine').value = 'bad'; await window.generate();
  assert.match(doc.getElementById('genError').textContent, /APT-XXXX/);
  doc.getElementById('machine').value = ''; doc.querySelectorAll('#techs input[data-tech]').forEach(i => { i.checked = false; }); await window.generate();
  assert.notEqual(doc.getElementById('genError').textContent, '');
  // language switch keeps the selection
  doc.querySelectorAll('#techs input[data-tech]').forEach(i => { i.checked = ['pv', 'ccgt'].includes(i.dataset.tech); });
  window.setLang('en');
  assert.equal(doc.documentElement.dir, 'ltr'); assert.match(doc.querySelector('h1').textContent, /License Generator/);
  assert.equal(doc.querySelectorAll('#techs input[data-tech]:checked').length, 2);
  // all technologies + lifetime => technologies null, no expiry
  doc.getElementById('allTechs').checked = true; window.toggleAllTechs(); doc.getElementById('type').value = 'lifetime';
  doc.querySelector('#modules input[data-module="exams"]').checked = true;
  await window.generate();
  const life = lic.verify(doc.getElementById('out').textContent, { publicKeyPems: [devPub] });
  assert.equal(life.valid, true); assert.equal(life.license.expiresAt, null); assert.deepEqual(life.license.features, { modules: ['twin', 'exams'], technologies: null });
  assert.equal(doc.querySelectorAll('#register tbody tr').length, 2);
  window.close();
});
