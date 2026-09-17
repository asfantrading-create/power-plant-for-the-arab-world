'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Store } = require('../src/main/services/store');
const { Auth, hashPassword, verifyPassword } = require('../src/main/services/auth');
const { tmpDir, rm } = require('./helpers');

test('password hashing uses scrypt and verifies', () => {
  const h = hashPassword('secret123');
  assert.ok(h.startsWith('scrypt$'));
  assert.equal(verifyPassword('secret123', h), true);
  assert.equal(verifyPassword('wrong', h), false);
  assert.equal(verifyPassword('secret123', 'garbage'), false);
});

test('roles, login, sessions and last-superadmin protection', () => {
  const dir = tmpDir();
  try {
    const auth = new Auth(new Store(dir));
    assert.equal(auth.hasSuperAdmin(), false);
    const admin = auth.createUser({ username: 'prof', password: 'pass123', displayName: 'Prof', role: 'superadmin' });
    assert.equal(admin.passwordHash, undefined, 'public user must not expose hash');
    assert.equal(auth.hasSuperAdmin(), true);
    assert.throws(() => auth.createUser({ username: 'prof', password: 'pass123', role: 'student' }), /username_taken/);
    assert.throws(() => auth.createUser({ username: 'x', password: 'pass123', role: 'student' }), /invalid_username/);
    assert.throws(() => auth.createUser({ username: 'stud1', password: '123', role: 'student' }), /weak_password/);
    const st = auth.createUser({ username: 'stud1', password: 'student123', role: 'student', studentNumber: '4411' });
    assert.throws(() => auth.login('stud1', 'nope'), /bad_credentials/);
    auth.login('stud1', 'student123');
    assert.equal(auth.current().username, 'stud1');
    assert.throws(() => auth.require('instructor'), /forbidden/);
    assert.ok(auth.require('student'));
    auth.logout();
    assert.throws(() => auth.require('student'), /not_authenticated/);
    assert.throws(() => auth.updateUser(admin.id, { role: 'student' }), /last_superadmin/);
    assert.throws(() => auth.removeUser(admin.id), /last_superadmin/);
    auth.changePassword(st.id, null, 'newpass99', { byAdmin: true });
    auth.login('stud1', 'newpass99');
    assert.equal(auth.current().id, st.id);
    auth.updateUser(st.id, { active: false });
    assert.equal(auth.current(), null, 'deactivated user loses session');
  } finally { rm(dir); }
});

test('bulk student import resolves groups and reports errors', () => {
  const dir = tmpDir();
  try {
    const auth = new Auth(new Store(dir));
    const groups = {};
    const res = auth.importStudents([
      { username: 'stud-a1', password: 'abcdef', displayName: 'A', groupName: 'EE401' },
      { username: 'stud-a2', password: '', displayName: 'B', groupName: 'EE401' },
      { username: '!!', password: 'abcdef' },
    ], { createdBy: 'x', groupResolver: n => (groups[n] = groups[n] || 'g-' + n) });
    assert.equal(res.created, 2); assert.equal(res.skipped, 1);
    assert.equal(auth.users().find(u => u.username === 'stud-a2').groupId, 'g-EE401');
    assert.equal(auth.users().find(u => u.username === 'stud-a2').mustChangePassword, true);
  } finally { rm(dir); }
});
