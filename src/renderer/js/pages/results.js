import { t, isAr } from '../i18n.js';
import { api } from '../api.js';
import { h, icon, badge, fmt, dataTable, toast } from '../ui.js';
import { navigate } from '../app.js';
import { exportCsvRows } from './admin-results.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('results.title'));
  const rows = await api('attempts:mine');
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('results.title')), h('p', null, t('results.intro'))),
    h('button', { class: 'btn', onClick: () => exportCsvRows(rows.filter(r => r.submittedAt), 'my-results.csv') }, icon('download'), t('common.exportCsv'))));
  container.append(dataTable({ rows: rows.filter(r => r.submittedAt), onRowClick: r => navigate(`/result/${r.id}`), emptyText: t('results.none'), initialSort: { key: 'submittedAt', dir: -1 }, columns: [
    { key: 'examTitle', label: t('results.exam'), get: r => isAr() && r.examTitleAr ? r.examTitleAr : r.examTitle },
    { key: 'kind', label: t('admin.results.filterKind'), render: v => badge(t('results.kind.' + v), v === 'exam' ? 'primary' : '') },
    { key: 'submittedAt', label: t('common.date'), render: v => fmt.datetime(v) },
    { key: 'attemptNumber', label: t('exams.attemptNo') },
    { key: 'score', label: t('exams.score'), render: (v, r) => `${v} / ${r.total}` },
    { key: 'percent', label: '%', render: v => fmt.pct(v, 1) },
    { key: 'passed', label: t('common.status'), render: v => badge(v ? t('exams.passed') : t('exams.failed'), v ? 'success' : 'danger') },
    { key: 'durationSec', label: t('exams.time'), render: v => fmt.duration(v) },
  ] }));
}
