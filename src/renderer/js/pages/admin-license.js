import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, setState } from '../state.js';
import { h, icon, toast, confirmDialog, field, badge, copyText } from '../ui.js';
import { licenseSummary } from './activation.js';
import { reloadBoot, rerender } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('nav.license'));
  const lic = await api('license:status');
  setState({ license: lic });
  const seats = lic.valid && lic.license ? Number(lic.license.seats) || 0 : 0;
  let seatsRow = null;
  if (seats > 0) {
    try { const used = (await api('users:list')).filter(u => u.active !== false).length; seatsRow = h('div', { class: `alert ${used >= seats ? 'warn' : 'info'} mt` }, `${t('license.seatsUsed')}: ${used} / ${seats}`); } catch { seatsRow = null; }
  }
  const ta = h('textarea', { placeholder: t('activation.paste'), style: { direction: 'ltr', fontFamily: 'monospace', fontSize: '.8rem' } });
  const msg = h('div');
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('nav.license')), h('p', null, lic.valid ? badge(t('license.valid'), 'success') : badge(t('license.invalid'), 'danger')))),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' }, h('h3', null, t('license.licensee')), lic.license ? licenseSummary(lic) : h('div', { class: 'muted' }, t('license.reason.missing')), seatsRow, lic.reason && !lic.valid ? h('div', { class: 'alert error mt' }, t('license.reason.' + lic.reason)) : null, lic.daysLeft !== null && lic.daysLeft !== undefined ? h('div', { class: `alert ${lic.daysLeft <= 30 ? 'warn' : 'info'} mt` }, `${t('license.daysLeft')}: ${lic.daysLeft}`) : null,
        h('dl', { class: 'kv mt' }, h('dt', null, t('activation.machineId')), h('dd', null, h('span', { class: 'mono' }, lic.machineId), ' ', h('button', { class: 'btn sm ghost', onClick: () => copyText(lic.machineId) }, t('common.copy'))), h('dt', null, t('common.source')), h('dd', { class: 'mono small' }, lic.source || '—'))),
      h('div', { class: 'card' }, h('h3', null, t('license.replace')), field(t('activation.key'), ta), msg,
        h('div', { class: 'flex wrap' }, h('button', { class: 'btn primary', onClick: async () => { try { const r = await api('license:activate', { key: ta.value }); if (r.valid) { toast(t('activation.success'), 'success'); await reloadBoot(); rerender(); } else msg.replaceChildren(h('div', { class: 'alert error' }, t('license.reason.' + r.reason))); } catch (err) { msg.replaceChildren(h('div', { class: 'alert error' }, errorMessage(err.code))); } } }, icon('key'), t('activation.activate')),
          h('button', { class: 'btn', onClick: async () => { const f = await api('app:openFileText', { filters: [{ name: 'License', extensions: ['lic', 'txt', 'key'] }] }); if (f) ta.value = f.text.trim(); } }, icon('file'), t('activation.loadFile')),
          lic.valid ? h('button', { class: 'btn danger', onClick: async () => { if (!(await confirmDialog(t('license.remove') + '?', { danger: true }))) return; await api('license:remove'); await reloadBoot(); rerender(); } }, icon('x'), t('license.remove')) : null))));
}
