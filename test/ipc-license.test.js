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
