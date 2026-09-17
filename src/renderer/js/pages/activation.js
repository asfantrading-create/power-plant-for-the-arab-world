import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, features } from '../state.js';
import { h, icon, toast, copyText, field } from '../ui.js';

export function licenseSummary(lic) {
  if (!lic || !lic.license) return null;
  const L = lic.license;
  const rows = [
    [t('license.licensee'), L.licensee.name || '—'], [t('license.org'), L.licensee.org || '—'],
    [t('license.type'), L.type === 'term' ? t('license.term') : t('license.lifetime')],
    [t('license.expires'), L.type === 'term' ? L.expiresAt : '∞'],
    [t('license.seats'), L.seats > 0 ? String(L.seats) : t('license.unlimited')], [t('license.issued'), L.issuedAt], [t('license.id'), L.id],
    [t('license.machineLock'), L.machineId ? L.machineId : t('common.no')],
  ];
  const f = lic.features || features();
  rows.push([t('license.modules'), f.modules.map(m => t('module.' + m)).join('، ')]);
  const techNames = f.technologies ? f.technologies.map(c => { const tk = state.dataset && state.dataset.technologies[c]; return tk ? (document.documentElement.lang === 'ar' ? tk.nameAr : tk.nameEn) : c; }).join('، ') : t('license.allTechnologies');
  rows.push([t('license.technologies'), techNames]);
  return h('dl', { class: 'kv' }, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
}

export function render({ onActivated }) {
  const lic = state.license || {};
  const ta = h('textarea', { placeholder: t('activation.paste'), style: { minHeight: '120px', direction: 'ltr', fontFamily: 'Consolas, monospace', fontSize: '.8rem' } });
  const msg = h('div');
  const reason = lic.reason && lic.reason !== 'missing' ? h('div', { class: 'alert error' }, t('license.reason.' + lic.reason)) : null;
  async function activate(key) {
    if (!key.trim()) return;
    try {
      const res = await api('license:activate', { key });
      if (res.valid) { toast(t('activation.success'), 'success'); onActivated(); }
      else { msg.replaceChildren(h('div', { class: 'alert error' }, t('license.reason.' + res.reason))); }
    } catch (err) { msg.replaceChildren(h('div', { class: 'alert error' }, errorMessage(err.code))); }
  }
  async function loadFile() {
    const f = await api('app:openFileText', { filters: [{ name: 'License', extensions: ['lic', 'txt', 'key'] }] });
    if (f) { ta.value = f.text.trim(); activate(ta.value); }
  }
  return h('div', { class: 'auth-card' },
    h('div', { class: 'logo' }, h('img', { src: 'assets/logo.png', alt: '' }), h('div', null, h('h1', null, t('app.name')), h('p', null, t('activation.title')))),
    h('p', null, t('activation.intro')),
    reason,
    lic.devKeysAccepted ? h('div', { class: 'alert info small' }, t('activation.devNotice')) : null,
    lic.productionKeyConfigured === false && !lic.devKeysAccepted ? h('div', { class: 'alert warn small' }, t('activation.noProdKey')) : null,
    field(t('activation.key'), ta),
    msg,
    h('div', { class: 'flex wrap' },
      h('button', { class: 'btn primary', onClick: () => activate(ta.value) }, icon('key'), t('activation.activate')),
      h('button', { class: 'btn', onClick: loadFile }, icon('file'), t('activation.loadFile'))),
    h('div', { class: 'card pad-sm mt' },
      h('div', { class: 'flex between' }, h('div', null, h('b', null, t('activation.machineId')), h('div', { class: 'mono' }, lic.machineId || '—')), h('button', { class: 'btn sm', onClick: () => copyText(lic.machineId || '') }, t('common.copy'))),
      h('div', { class: 'help' }, t('activation.machineHelp'))),
    h('p', { class: 'muted small mt' }, t('activation.contact')));
}
