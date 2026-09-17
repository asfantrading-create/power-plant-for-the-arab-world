'use strict';
/** Users, password hashing (scrypt) and role checks. Roles: superadmin > instructor > student. */
const crypto = require('node:crypto');
const { Store } = require('./store');

const ROLES = ['superadmin', 'instructor', 'student'];
const RANK = { superadmin: 3, instructor: 2, student: 1 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(password, stored) {
  try {
    const [algo, saltHex, hashHex] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const hash = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
  } catch { return false; }
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

class Auth {
  constructor(store) {
    this.store = store;
    this.session = null; // { userId, role, username, loginAt }
  }

  users() { return this.store.list('users'); }
  hasSuperAdmin() { return this.users().some(u => u.role === 'superadmin' && u.active !== false); }
  findByUsername(username) {
    const n = String(username || '').trim().toLowerCase();
    return this.users().find(u => u.username.toLowerCase() === n) || null;
  }

  createUser({ username, password, displayName, role, groupId, studentNumber, email, createdBy, mustChangePassword }) {
    username = String(username || '').trim();
    if (!/^[A-Za-z0-9_.@-]{3,64}$/.test(username)) throw new Error('invalid_username');
    if (String(password || '').length < 6) throw new Error('weak_password');
    if (!ROLES.includes(role)) throw new Error('invalid_role');
    if (this.findByUsername(username)) throw new Error('username_taken');
    const user = {
      id: Store.newId('u-'),
      username, displayName: String(displayName || username).trim(), role,
      groupId: groupId || null, studentNumber: studentNumber ? String(studentNumber) : null, email: email || null,
      passwordHash: hashPassword(password), active: true, createdBy: createdBy || null,
      mustChangePassword: !!mustChangePassword, lastLoginAt: null,
    };
    this.store.put('users', user);
    return publicUser(user);
  }

  login(username, password) {
    const user = this.findByUsername(username);
    if (!user || user.active === false || !verifyPassword(password, user.passwordHash)) throw new Error('bad_credentials');
    user.lastLoginAt = new Date().toISOString();
    this.store.put('users', user);
    this.session = { userId: user.id, role: user.role, username: user.username, loginAt: user.lastLoginAt };
    return publicUser(user);
  }

  logout() { this.session = null; }

  current() {
    if (!this.session) return null;
    const u = this.store.get('users', this.session.userId);
    if (!u || u.active === false) { this.session = null; return null; }
    return publicUser(u);
  }

  require(minRole = 'student') {
    const u = this.current();
    if (!u) throw new Error('not_authenticated');
    if (RANK[u.role] < RANK[minRole]) throw new Error('forbidden');
    return u;
  }

  changePassword(userId, oldPassword, newPassword, { byAdmin = false } = {}) {
    const user = this.store.get('users', userId);
    if (!user) throw new Error('not_found');
    if (!byAdmin && !verifyPassword(oldPassword, user.passwordHash)) throw new Error('bad_credentials');
    if (String(newPassword || '').length < 6) throw new Error('weak_password');
    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;
    this.store.put('users', user);
    return publicUser(user);
  }

  updateUser(userId, patch) {
    const user = this.store.get('users', userId);
    if (!user) throw new Error('not_found');
    const allowed = ['displayName', 'role', 'groupId', 'studentNumber', 'email', 'active'];
    for (const k of allowed) if (k in patch) user[k] = patch[k];
    if (!ROLES.includes(user.role)) throw new Error('invalid_role');
    if (user.role !== 'superadmin' && !this.users().some(u => u.id !== user.id && u.role === 'superadmin' && u.active !== false)) {
      throw new Error('last_superadmin');
    }
    if (user.active === false && user.role === 'superadmin' && !this.users().some(u => u.id !== user.id && u.role === 'superadmin' && u.active !== false)) {
      throw new Error('last_superadmin');
    }
    this.store.put('users', user);
    return publicUser(user);
  }

  removeUser(userId) {
    const user = this.store.get('users', userId);
    if (!user) return false;
    if (user.role === 'superadmin' && !this.users().some(u => u.id !== user.id && u.role === 'superadmin' && u.active !== false)) throw new Error('last_superadmin');
    return this.store.remove('users', userId);
  }

  /** Bulk import "username,password,displayName,studentNumber,groupName" rows (CSV parsed by caller). */
  importStudents(rows, { createdBy, groupResolver }) {
    const results = { created: 0, skipped: 0, errors: [] };
    for (const r of rows) {
      try {
        const groupId = r.groupName && groupResolver ? groupResolver(r.groupName) : (r.groupId || null);
        this.createUser({ username: r.username, password: r.password || 'student123', displayName: r.displayName, role: 'student', groupId, studentNumber: r.studentNumber, email: r.email, createdBy, mustChangePassword: true });
        results.created++;
      } catch (err) {
        results.skipped++;
        results.errors.push({ username: r.username, error: err.message });
      }
    }
    return results;
  }
}

module.exports = { Auth, ROLES, RANK, hashPassword, verifyPassword, publicUser };
