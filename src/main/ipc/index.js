'use strict';
/** IPC surface of the main process. Every handler returns { ok, data } or { ok:false, error }. */
const { ipcMain, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const exporter = require('../services/exporter');
const { Store } = require('../services/store');
const { ROLES } = require('../services/auth');

function parseCsvText(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const split = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if ((ch === ',' || ch === ';' || ch === '\t') && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  const header = split(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const known = ['username', 'password', 'displayname', 'studentnumber', 'groupname', 'email'];
  const hasHeader = header.some(h => known.includes(h));
  const rows = [];
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const cells = split(line);
    const r = {};
    if (hasHeader) header.forEach((h, i) => { r[h] = cells[i]; });
    else { r.username = cells[0]; r.password = cells[1]; r.displayname = cells[2]; r.studentnumber = cells[3]; r.groupname = cells[4]; r.email = cells[5]; }
    rows.push({ username: r.username, password: r.password, displayName: r.displayname, studentNumber: r.studentnumber, groupName: r.groupname, email: r.email });
  }
  return rows;
}

function register(ctx) {
  const handle = (channel, minRole, fn) => {
    ipcMain.handle(channel, async (event, payload) => {
      try {
        const user = minRole ? ctx.auth().require(minRole) : ctx.auth().current();
        const data = await fn(payload || {}, user, event);
        return { ok: true, data };
      } catch (err) {
        ctx.log.warn(`${channel} failed:`, err && err.message);
        return { ok: false, error: (err && err.message) || String(err) };
      }
    });
  };
  const audit = (action, by, details) => { try { ctx.store().put('audit', { id: Store.newId('a-'), action, by: by ? by.username : null, at: new Date().toISOString(), details: details || null }); } catch { /* ignore */ } };
  const win = () => ctx.getWindow();

  // ---- app / settings ----
  handle('app:bootstrap', null, () => ctx.bootstrap());
  handle('app:openExternal', null, ({ url }) => { if (!/^https?:\/\//i.test(url)) throw new Error('bad_url'); return shell.openExternal(url); });
  handle('app:showItemInFolder', null, ({ path: p }) => { if (p) shell.showItemInFolder(p); return true; });
  handle('app:chooseDirectory', 'superadmin', async () => { const r = await dialog.showOpenDialog(win(), { properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
  handle('app:openFileText', null, async ({ filters }) => {
    const r = await dialog.showOpenDialog(win(), { properties: ['openFile'], filters: filters || [{ name: 'Text', extensions: ['csv', 'txt', 'lic', 'json'] }] });
    if (r.canceled) return null;
    return { path: r.filePaths[0], text: fs.readFileSync(r.filePaths[0], 'utf8').slice(0, 5_000_000) };
  });
  handle('settings:get', null, () => ctx.settings.all());
  handle('settings:set', null, ({ key, value }) => {
    const free = ['language', 'theme', 'windowBounds'];
    if (!free.includes(key)) ctx.auth().require('superadmin');
    if (key === 'workspaceDir') return ctx.setWorkspaceDir(value);
    ctx.settings.set(key, value);
    if (key === 'updateFeedUrl' || key === 'autoCheckUpdates') ctx.updater.state.needsRestart = true;
    return ctx.settings.all();
  });

  // ---- license & setup ----
  handle('license:status', null, () => ctx.licenseStatus());
  handle('license:activate', null, ({ key }) => {
    if (ctx.auth().hasSuperAdmin()) ctx.auth().require('superadmin');
    const res = ctx.activateLicense(key);
    if (res.valid) audit('license.activate', ctx.auth().current(), { id: res.license.id, licensee: res.license.licensee });
    return res;
  });
  handle('license:remove', 'superadmin', (_p, user) => { ctx.removeLicense(); audit('license.remove', user); return ctx.licenseStatus(); });
  handle('setup:createSuperAdmin', null, ({ username, password, displayName, institutionName }) => {
    if (ctx.auth().hasSuperAdmin()) throw new Error('already_setup');
    if (!ctx.licenseStatus().valid) throw new Error('license_required');
    const u = ctx.auth().createUser({ username, password, displayName, role: 'superadmin' });
    if (institutionName) ctx.settings.set('institutionName', String(institutionName).slice(0, 200));
    ctx.store().setMeta('schemaVersion', 1);
    audit('setup.superadmin', u, { username });
    return ctx.auth().login(username, password);
  });

  // ---- auth ----
  handle('auth:login', null, ({ username, password }) => { if (!ctx.licenseStatus().valid) throw new Error('license_required'); const u = ctx.auth().login(username, password); audit('auth.login', u); return u; });
  handle('auth:logout', null, (_p, user) => { audit('auth.logout', user); ctx.auth().logout(); return true; });
  handle('auth:current', null, () => ctx.auth().current());
  handle('auth:changePassword', 'student', ({ oldPassword, newPassword }, user) => ctx.auth().changePassword(user.id, oldPassword, newPassword));

  // ---- users & groups ----
  handle('users:list', 'instructor', () => ctx.auth().users().map(u => { const { passwordHash, ...r } = u; return r; }));
  handle('users:create', 'instructor', (p, user) => {
    if (p.role !== 'student') ctx.auth().require('superadmin');
    if (!ROLES.includes(p.role)) throw new Error('invalid_role');
    const u = ctx.auth().createUser({ ...p, createdBy: user.id, mustChangePassword: p.role === 'student' });
    audit('users.create', user, { username: u.username, role: u.role });
    return u;
  });
  handle('users:update', 'instructor', ({ id, patch }, user) => {
    const target = ctx.store().get('users', id);
    if (!target) throw new Error('not_found');
    if (user.role !== 'superadmin' && (target.role !== 'student' || patch.role)) throw new Error('forbidden');
    const u = ctx.auth().updateUser(id, patch);
    audit('users.update', user, { id, patch });
    return u;
  });
  handle('users:remove', 'superadmin', ({ id }, user) => { const r = ctx.auth().removeUser(id); audit('users.remove', user, { id }); return r; });
  handle('users:resetPassword', 'instructor', ({ id, newPassword }, user) => {
    const target = ctx.store().get('users', id);
    if (!target) throw new Error('not_found');
    if (user.role !== 'superadmin' && target.role !== 'student') throw new Error('forbidden');
    const u = ctx.auth().changePassword(id, null, newPassword, { byAdmin: true });
    u.mustChangePassword = true; ctx.store().put('users', { ...ctx.store().get('users', id), mustChangePassword: true });
    audit('users.resetPassword', user, { id });
    return u;
  });
  handle('users:importCsv', 'instructor', ({ text }, user) => {
    const rows = parseCsvText(text);
    const groups = ctx.store().list('groups');
    const resolver = name => {
      const n = String(name).trim(); if (!n) return null;
      let g = groups.find(x => x.name.toLowerCase() === n.toLowerCase());
      if (!g) { g = ctx.store().put('groups', { id: Store.newId('g-'), name: n, createdBy: user.id }); groups.push(g); }
      return g.id;
    };
    const res = ctx.auth().importStudents(rows, { createdBy: user.id, groupResolver: resolver });
    audit('users.import', user, { created: res.created, skipped: res.skipped });
    return res;
  });
  handle('groups:list', 'student', () => ctx.store().list('groups'));
  handle('groups:create', 'instructor', ({ name, description }, user) => {
    if (!String(name || '').trim()) throw new Error('name_required');
    return ctx.store().put('groups', { id: Store.newId('g-'), name: String(name).trim(), description: description || '', createdBy: user.id });
  });
  handle('groups:update', 'instructor', ({ id, patch }) => { const g = ctx.store().get('groups', id); if (!g) throw new Error('not_found'); return ctx.store().put('groups', { ...g, name: patch.name ?? g.name, description: patch.description ?? g.description }); });
  handle('groups:remove', 'superadmin', ({ id }) => { for (const u of ctx.auth().users()) if (u.groupId === id) ctx.store().put('users', { ...u, groupId: null }); return ctx.store().remove('groups', id); });

  // ---- data ----
  handle('data:dataset', null, () => ctx.dataset);
  handle('data:map', null, () => ctx.map);
  handle('data:questionBankInfo', 'instructor', () => ({ topics: ctx.bank.topics, counts: ctx.bank.questions.reduce((a, q) => { a[q.topic] = (a[q.topic] || 0) + 1; return a; }, {}), total: ctx.bank.questions.length }));

  // ---- exams & attempts ----
  handle('exams:list', 'student', (_p, user) => ctx.exams().listForUser(user).map(e => ({ ...e, attemptsUsed: ctx.exams().attemptsOf(user.id, e.id).filter(a => a.submittedAt).length })));
  handle('exams:all', 'instructor', () => ctx.exams().list());
  handle('exams:create', 'instructor', (p, user) => { const e = ctx.exams().create(p, user.id); audit('exams.create', user, { id: e.id, title: e.title }); return e; });
  handle('exams:update', 'instructor', ({ id, patch }, user) => { const e = ctx.exams().update(id, patch); audit('exams.update', user, { id }); return e; });
  handle('exams:remove', 'instructor', ({ id }, user) => { audit('exams.remove', user, { id }); return ctx.exams().remove(id); });
  handle('attempts:start', 'student', ({ examId }, user) => ctx.exams().start(examId, user));
  handle('practice:start', 'student', (cfg, user) => ctx.exams().startPractice(cfg, user));
  handle('attempts:save', 'student', ({ attemptId, answers }, user) => ctx.exams().save(attemptId, answers, user));
  handle('attempts:submit', 'student', ({ attemptId, answers }, user) => ctx.exams().submit(attemptId, answers, user));
  handle('attempts:mine', 'student', (_p, user) => ctx.exams().mine(user));
  handle('attempts:get', 'student', ({ id }, user) => ctx.exams().getView(id, user));
  handle('attempts:query', 'instructor', filter => ctx.exams().query(filter));
  handle('attempts:stats', 'instructor', filter => ctx.exams().stats(filter));

  // ---- digital-twin practice sessions ----
  handle('twin:logSession', 'student', (s, user) => ctx.store().put('sessions', {
    id: Store.newId('s-'), userId: user.id, username: user.username, displayName: user.displayName, groupId: user.groupId || null,
    plantId: String(s.plantId || ''), plantName: String(s.plantName || '').slice(0, 200), startedAt: s.startedAt, endedAt: new Date().toISOString(),
    durationSec: Number(s.durationSec) || 0, kpis: s.kpis && typeof s.kpis === 'object' ? s.kpis : {}, events: Array.isArray(s.events) ? s.events.slice(-200) : [],
  }));
  handle('twin:sessions', 'student', ({ userId } = {}, user) => {
    const all = ctx.store().list('sessions');
    const rows = user.role === 'student' ? all.filter(s => s.userId === user.id) : (userId ? all.filter(s => s.userId === userId) : all);
    return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 2000);
  });

  // ---- exports ----
  handle('export:csv', 'student', p => exporter.exportCsv(win(), p));
  handle('export:json', 'student', p => exporter.exportJson(win(), p));
  handle('export:html', 'student', p => exporter.exportHtml(win(), p));
  handle('export:pdf', 'student', p => exporter.exportPdf(win(), p));
  handle('export:text', 'student', p => exporter.saveTextFile(win(), p));

  // ---- updater ----
  handle('updater:status', null, () => ctx.updater.state);
  handle('updater:check', null, () => ctx.updater.check());
  handle('updater:download', null, () => ctx.updater.download());
  handle('updater:install', null, () => ctx.updater.install());

  // ---- admin: audit & workspace ----
  handle('audit:list', 'superadmin', ({ limit } = {}) => ctx.store().list('audit').sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit || 500));
  handle('workspace:info', 'superadmin', () => ({
    dir: ctx.store().dir, users: ctx.store().count('users'), groups: ctx.store().count('groups'), exams: ctx.store().count('exams'),
    attempts: ctx.store().count('attempts'), sessions: ctx.store().count('sessions'), error: ctx.workspaceError || null,
  }));
  handle('workspace:backup', 'superadmin', async (_p, user) => {
    const s = ctx.store();
    const data = { exportedAt: new Date().toISOString(), app: ctx.bootstrap().version, institution: ctx.settings.get('institutionName') };
    for (const c of ['users', 'groups', 'exams', 'attempts', 'sessions', 'audit']) data[c] = s.list(c);
    audit('workspace.backup', user);
    return exporter.exportJson(win(), { data, suggestedName: `arab-power-twin-backup-${new Date().toISOString().slice(0, 10)}.json` });
  });
  handle('workspace:restore', 'superadmin', ({ text, mode }, user) => {
    const data = JSON.parse(text);
    const s = ctx.store();
    let n = 0;
    for (const c of ['users', 'groups', 'exams', 'attempts', 'sessions']) {
      for (const rec of data[c] || []) {
        if (!rec || !rec.id) continue;
        if (mode === 'merge' && s.get(c, rec.id)) continue;
        s.put(c, rec); n++;
      }
    }
    audit('workspace.restore', user, { records: n, mode });
    return { restored: n };
  });
}

module.exports = { register, parseCsvText };
