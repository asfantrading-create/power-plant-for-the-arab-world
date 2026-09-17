'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tmpDir, rm } = require('./helpers');
const { buildMainContext } = require('./helpers-ipc');

test('an expired/invalid license can be replaced before login even when a super admin already exists (no lockout)', async () => {
  const ws = tmpDir();
  try {
    const { handlers, validKey, auth } = buildMainContext(ws);
    // first-run: activate, create super admin, log out
    assert.equal((await handlers['license:activate']({}, { key: validKey })).data.valid, true);
    assert.equal((await handlers['setup:createSuperAdmin']({}, { username: 'prof', password: 'pass1234', displayName: 'Prof' })).ok, true);
    await handlers['auth:logout']({}, {});
    // license disappears (e.g. expired, machine mismatch after reinstall, deleted key)
    await handlers['license:remove']({}, {}).catch(() => {}); // requires superadmin -> rejected
    // simulate loss directly
    const st = await handlers['license:status']({}, {});
    assert.equal(st.ok, true);
    auth.logout();
    const ctxRemove = handlers['license:activate'];
    // remove through the context (what an expiry effectively does)
    const before = await handlers['auth:login']({}, { username: 'prof', password: 'pass1234' });
    assert.equal(before.ok, true);
    const rm1 = await handlers['license:remove']({}, {});
    assert.equal(rm1.ok, true); assert.equal(rm1.data.valid, false);
    await handlers['auth:logout']({}, {});
    // now: super admin exists, license invalid, nobody logged in
    const login = await handlers['auth:login']({}, { username: 'prof', password: 'pass1234' });
    assert.equal(login.ok, false); assert.equal(login.error, 'license_required');
    const act = await ctxRemove({}, { key: validKey });
    assert.equal(act.ok, true, JSON.stringify(act));
    assert.equal(act.data.valid, true);
    const login2 = await handlers['auth:login']({}, { username: 'prof', password: 'pass1234' });
    assert.equal(login2.ok, true);
    // replacing a VALID license still requires a super admin
    await handlers['auth:logout']({}, {});
    const act2 = await handlers['license:activate']({}, { key: validKey });
    assert.equal(act2.ok, false); assert.equal(act2.error, 'not_authenticated');
  } finally { rm(ws); }
});

test('instructors can edit students (role echoed back by the form) but not promote them', async () => {
  const ws = tmpDir();
  try {
    const { handlers, validKey } = buildMainContext(ws);
    await handlers['license:activate']({}, { key: validKey });
    await handlers['setup:createSuperAdmin']({}, { username: 'prof', password: 'pass1234', displayName: 'Prof' });
    const inst = (await handlers['users:create']({}, { username: 'teach1', password: 'pass1234', displayName: 'T', role: 'instructor' })).data;
    const st = (await handlers['users:create']({}, { username: 'stud1', password: 'pass1234', displayName: 'S', role: 'student' })).data;
    await handlers['auth:logout']({}, {});
    assert.equal((await handlers['auth:login']({}, { username: 'teach1', password: 'pass1234' })).ok, true);
    const edit = await handlers['users:update']({}, { id: st.id, patch: { displayName: 'Student Renamed', role: 'student', groupId: null } });
    assert.equal(edit.ok, true, JSON.stringify(edit)); assert.equal(edit.data.displayName, 'Student Renamed');
    const promote = await handlers['users:update']({}, { id: st.id, patch: { role: 'instructor' } });
    assert.equal(promote.ok, false); assert.equal(promote.error, 'forbidden');
    const editInst = await handlers['users:update']({}, { id: inst.id, patch: { displayName: 'x' } });
    assert.equal(editInst.ok, false);
    // students may read topic labels (needed on their result page)
    await handlers['auth:logout']({}, {});
    await handlers['auth:login']({}, { username: 'stud1', password: 'pass1234' });
    const info = await handlers['data:questionBankInfo']({}, {});
    assert.equal(info.ok, true); assert.ok(info.data.topics.general);
  } finally { rm(ws); }
});

test('license seats cap the number of accounts (create, import, reactivate)', async () => {
  const ws = tmpDir();
  try {
    const { handlers, issue } = buildMainContext(ws);
    await handlers['license:activate']({}, { key: issue({ licensee: { org: 'Small College' }, type: 'lifetime', seats: 3 }) });
    await handlers['setup:createSuperAdmin']({}, { username: 'prof', password: 'pass1234', displayName: 'Prof' }); // seat 1
    assert.equal((await handlers['users:create']({}, { username: 'stud1', password: 'pass1234', displayName: 'S1', role: 'student' })).ok, true); // seat 2
    const imp = await handlers['users:importCsv']({}, { text: 'stud2,pass1234,S2\nstud3,pass1234,S3' });
    assert.equal(imp.data.created, 1); assert.equal(imp.data.skipped, 1); assert.equal(imp.data.errors[0].error, 'seats_exceeded');
    const full = await handlers['users:create']({}, { username: 'stud4', password: 'pass1234', displayName: 'S4', role: 'student' });
    assert.equal(full.ok, false); assert.equal(full.error, 'seats_exceeded');
    const users = (await handlers['users:list']({}, {})).data;
    const s1 = users.find(u => u.username === 'stud1');
    assert.equal((await handlers['users:update']({}, { id: s1.id, patch: { active: false } })).ok, true);
    assert.equal((await handlers['users:create']({}, { username: 'stud5', password: 'pass1234', displayName: 'S5', role: 'student' })).ok, true, 'a freed seat can be reused');
    const react = await handlers['users:update']({}, { id: s1.id, patch: { active: true } });
    assert.equal(react.ok, false); assert.equal(react.error, 'seats_exceeded');
    // unlimited license lifts the cap
    await handlers['license:activate']({}, { key: issue({ licensee: { org: 'Small College' }, type: 'lifetime', seats: 0 }) });
    assert.equal((await handlers['users:create']({}, { username: 'stud6', password: 'pass1234', displayName: 'S6', role: 'student' })).ok, true);
  } finally { rm(ws); }
});

test('license modules and technologies are enforced by the main process', async () => {
  const ws = tmpDir();
  try {
    const { handlers, issue } = buildMainContext(ws);
    await handlers['license:activate']({}, { key: issue({ licensee: { org: 'Solar Institute' }, type: 'lifetime', features: { modules: ['twin'], technologies: ['pv', 'csp_tower'] } }) });
    const st = (await handlers['license:status']({}, {})).data;
    assert.deepEqual(st.features, { modules: ['twin'], technologies: ['pv', 'csp_tower'] });
    await handlers['setup:createSuperAdmin']({}, { username: 'prof', password: 'pass1234', displayName: 'Prof' });
    const ex = await handlers['exams:create']({}, { title: 'X', topics: ['general'], questionCount: 5 });
    assert.equal(ex.ok, false); assert.equal(ex.error, 'module_locked');
    const pr = await handlers['practice:start']({}, { topics: ['general'], questionCount: 5 });
    assert.equal(pr.error, 'module_locked');
    const bad = await handlers['twin:logSession']({}, { plantId: 'are-barakah', plantName: 'Barakah', startedAt: new Date().toISOString(), durationSec: 30, kpis: {} });
    assert.equal(bad.error, 'tech_locked');
    const good = await handlers['twin:logSession']({}, { plantId: 'are-al-dhafra-pv', plantName: 'Al Dhafra', startedAt: new Date().toISOString(), durationSec: 30, kpis: {} });
    assert.equal(good.ok, true);
    // with exams enabled but technologies restricted, generated questions only use licensed technologies
    await handlers['license:activate']({}, { key: issue({ licensee: { org: 'Solar Institute' }, type: 'lifetime', features: { modules: ['twin', 'exams'], technologies: ['pv'] } }) });
    const p = await handlers['practice:start']({}, { topics: ['general'], questionCount: 12, generatedShare: 1, plantScope: { countries: [], technologies: ['nuclear_pwr', 'pv'] } });
    assert.equal(p.ok, true, JSON.stringify(p));
    const ds = require('./helpers').loadDataset();
    for (const q of p.data.questions) if (q.plantId) assert.equal(ds.plants.find(x => x.id === q.plantId).technology, 'pv', q.id);
  } finally { rm(ws); }
});
