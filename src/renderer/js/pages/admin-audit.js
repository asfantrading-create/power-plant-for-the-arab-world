import { t } from '../i18n.js';
import { api } from '../api.js';
import { h, dataTable, fmt } from '../ui.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('audit.title'));
  const rows = await api('audit:list', { limit: 1000 });
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('audit.title')))),
    dataTable({ rows, pageSize: 40, initialSort: { key: 'at', dir: -1 }, columns: [
      { key: 'at', label: t('common.date'), render: v => fmt.datetime(v) }, { key: 'action', label: t('audit.action'), render: v => h('span', { class: 'mono' }, v) }, { key: 'by', label: t('audit.by') },
      { key: 'details', label: t('audit.details'), render: v => h('span', { class: 'small mono' }, v ? JSON.stringify(v).slice(0, 160) : '') },
    ] }));
}
