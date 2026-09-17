import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, setState } from '../state.js';
import { h, icon, toast, field, fmt, dataTable, badge } from '../ui.js';
import { navigate, reloadBoot } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('profile.title'));
  const u = state.user;
  const groups = await api('groups:list').catch(() => []);
  const g = groups.find(x => x.id === u.groupId);
  const oldPw = h('input', { type: 'password' }); const newPw = h('input', { type: 'password' }); const newPw2 = h('input', { type: 'password' });
  const msg = h('div');
  const form = h('form', { class: 'card', onSubmit: async e => {
    e.preventDefault();
    if (newPw.value !== newPw2.value) { msg.replaceChildren(h('div', { class: 'alert error' }, t('setup.mismatch'))); return; }
    try { await api('auth:changePassword', { oldPassword: oldPw.value, newPassword: newPw.value }); toast(t('profile.changed'), 'success'); await reloadBoot(); if (params.mustChange) navigate('/dashboard'); else { oldPw.value = newPw.value = newPw2.value = ''; msg.replaceChildren(); } }
    catch (err) { msg.replaceChildren(h('div', { class: 'alert error' }, errorMessage(err.code))); }
  } }, h('h3', null, t('profile.changePassword')), u.mustChangePassword ? h('div', { class: 'alert warn' }, t('profile.mustChange')) : null,
    field(t('profile.old'), oldPw), field(t('profile.new'), newPw), field(t('setup.password2'), newPw2), msg, h('button', { class: 'btn primary', type: 'submit' }, icon('key'), t('profile.changePassword')));
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, u.displayName || u.username), h('p', null, `${u.username} · ${t('role.' + u.role)}${g ? ' · ' + g.name : ''}${u.studentNumber ? ' · ' + u.studentNumber : ''}`))),
    h('div', { class: 'grid cols-2' }, form, h('div', { class: 'card' }, h('h3', null, t('profile.sessions')), h('div', { class: 'sessions' }, t('common.loading')))));
  const box = container.querySelector('.sessions');
  api('twin:sessions').then(rows => { box.replaceChildren(dataTable({ rows, pageSize: 10, columns: [
    { key: 'plantName', label: t('admin.sessions.plant') }, { key: 'startedAt', label: t('common.date'), render: v => fmt.datetime(v) }, { key: 'durationSec', label: t('admin.sessions.duration'), render: v => fmt.duration(v) },
    { key: 'energy', label: t('admin.sessions.energy'), get: r => r.kpis?.energyMwh, render: v => `${fmt.num(v, 1)} MWh` }, { key: 'cf', label: t('admin.sessions.cf'), get: r => r.kpis?.capacityFactor, render: v => fmt.pct((v || 0) * 100) }, { key: 'trips', label: t('admin.sessions.trips'), get: r => r.kpis?.trips }] })); }).catch(() => { box.textContent = '—'; });
}
