import { t, L } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { h, icon, copyText } from '../ui.js';
import { licenseSummary } from './activation.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('about.title'));
  const b = state.boot; const ds = state.dataset;
  container.append(h('div', { class: 'hero-banner mb' }, h('div', { class: 'flex gap-lg' }, h('img', { src: 'assets/logo.png', width: 72, height: 72, alt: '' }), h('div', null, h('h1', null, t('app.name')), h('p', { class: 'muted' }, `${t('app.short')} · ${t('about.version')} ${b.version}`))),
    h('button', { class: 'btn', onClick: () => api('app:openExternal', { url: 'https://github.com/asfantrading-create/power-plant-for-the-arab-world' }) }, icon('globe'), 'GitHub')),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' }, h('h3', null, t('about.data')), h('p', null, t('about.dataText')), h('ul', { class: 'small muted' }, (ds.sources || []).map(s => h('li', null, `${s.name} — ${s.license}`))), h('dl', { class: 'kv mt' }, h('dt', null, t('about.plants')), h('dd', null, String(ds.plants.length)), h('dt', null, t('about.techs')), h('dd', null, Object.values(ds.technologies).map(x => L(x, 'name')).join('، ')))),
      h('div', { class: 'card' }, h('h3', null, t('about.disclaimer')), h('p', null, t('about.disclaimerText')), h('dl', { class: 'kv mt' }, h('dt', null, t('about.machine')), h('dd', null, h('span', { class: 'mono' }, b.machineId), ' ', h('button', { class: 'btn sm ghost', onClick: () => copyText(b.machineId) }, t('common.copy'))), h('dt', null, t('about.workspace')), h('dd', { class: 'mono' }, b.workspaceDir)))),
    h('div', { class: 'card mt' }, h('h3', null, t('nav.license')), licenseSummary(state.license)));
}
