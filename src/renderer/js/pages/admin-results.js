import { t, isAr, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { h, icon, toast, selectEl, dataTable, badge, fmt, statCard, progress } from '../ui.js';
import { barChart, destroyChart } from '../lib/charts.js';
import { studentSummaryHtml, topicLabel } from '../lib/report.js';
import { navigate } from '../app.js';

export async function exportCsvRows(rows, name) {
  const columns = [
    { key: 'displayName', label: t('admin.results.student') }, { key: 'username', label: t('admin.users.username') }, { key: 'groupName', label: t('admin.users.group') }, { key: 'examTitle', label: t('results.exam') }, { key: 'kind', label: t('admin.results.filterKind') },
    { key: 'attemptNumber', label: t('exams.attemptNo') }, { key: 'startedAt', label: t('common.date') }, { key: 'submittedAt', label: t('exams.result') }, { key: 'durationSec', label: t('exams.time') + ' (s)' }, { key: 'score', label: t('exams.score') }, { key: 'total', label: t('common.total') }, { key: 'percent', label: '%' }, { key: 'passMark', label: t('exams.passMark') }, { key: 'passed', label: t('common.status') }, { key: 'late', label: t('exams.late') },
  ];
  try { const r = await api('export:csv', { rows: rows.map(x => ({ ...x, passed: x.passed ? 'PASS' : 'FAIL', late: x.late ? 'yes' : 'no' })), columns, suggestedName: name || 'results.csv' }); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); }
  catch (err) { toast(t('common.exportFailed') + ': ' + errorMessage(err.code), 'error'); }
}

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.results.title'));
  const [exams, groups, users, bank] = await Promise.all([api('exams:all'), api('groups:list'), api('users:list'), api('data:questionBankInfo')]);
  state.cache.topics = bank.topics;
  const selExam = selectEl([{ value: '', label: t('common.all') + ' – ' + t('admin.results.filterExam') }, { value: 'practice', label: t('exams.practiceTitle') }, ...exams.map(e => ({ value: e.id, label: isAr() && e.titleAr ? e.titleAr : e.title }))], params.examId || '');
  const selGroup = selectEl([{ value: '', label: t('common.all') + ' – ' + t('admin.results.filterGroup') }, ...groups.map(g => ({ value: g.id, label: g.name }))], params.groupId || '');
  const selUser = selectEl([{ value: '', label: t('common.all') + ' – ' + t('admin.results.filterStudent') }, ...users.filter(u => u.role === 'student').map(u => ({ value: u.id, label: `${u.displayName} (${u.username})` }))], params.userId || '');
  const selKind = selectEl([{ value: 'exam', label: t('results.kind.exam') }, { value: 'practice', label: t('results.kind.practice') }, { value: '', label: t('common.all') }], params.kind ?? 'exam');
  const statsBox = h('div', { class: 'grid cols-4 mb' }); const chartsBox = h('div', { class: 'grid cols-3 mb' }); const tableBox = h('div'); const perStudentBox = h('div', { class: 'mt' });
  let charts = [], rows = [];
  const gname = id => (groups.find(g => g.id === id) || {}).name || '—';
  async function load() {
    const filter = { examId: selExam.value || undefined, groupId: selGroup.value || undefined, userId: selUser.value || undefined, kind: selKind.value || undefined };
    const [list, st] = await Promise.all([api('attempts:query', filter), api('attempts:stats', filter)]);
    rows = list.map(r => ({ ...r, groupName: gname(r.groupId) }));
    statsBox.replaceChildren(statCard('exam', fmt.num(st.count), t('dash.attempts')), statCard('results', fmt.pct(st.mean, 1), t('admin.results.mean')), statCard('results', fmt.pct(st.median, 1), t('admin.results.median')), statCard('check', fmt.pct(st.passRate, 1), t('admin.results.passRate')));
    charts.forEach(destroyChart); charts = [];
    const c1 = h('canvas'), c2 = h('canvas');
    chartsBox.replaceChildren(h('div', { class: 'card', style: { height: '260px' } }, h('h4', null, t('admin.results.distribution')), h('div', { style: { height: '190px' } }, c1)),
      h('div', { class: 'card', style: { height: '260px' } }, h('h4', null, t('admin.results.byTopic')), h('div', { style: { height: '190px' } }, c2)),
      h('div', { class: 'card', style: { height: '260px', overflow: 'auto' } }, h('h4', null, t('admin.results.byExam')), Object.values(st.byExam).map(b => h('div', { style: { marginBottom: '6px' } }, h('div', { class: 'flex between small' }, h('span', null, isAr() && b.titleAr ? b.titleAr : b.title), h('span', { class: 'num' }, `${fmt.pct(b.mean, 1)} · ${b.count}`)), progress(b.mean, b.mean >= 60 ? 'success' : 'danger')))));
    if (st.count) {
      charts.push(barChart(c1, { labels: st.histogram.map(x => x.range), data: st.histogram.map(x => x.count), label: t('common.count') }));
      const topics = Object.entries(st.byTopic);
      charts.push(barChart(c2, { labels: topics.map(([k]) => topicLabel(k)), data: topics.map(([, v]) => Math.round(v.correct / v.total * 100)), label: '%', horizontal: true }));
    }
    tableBox.replaceChildren(dataTable({ rows, pageSize: 25, initialSort: { key: 'submittedAt', dir: -1 }, emptyText: t('admin.results.noData'), onRowClick: r => navigate(`/result/${r.id}`), columns: [
      { key: 'displayName', label: t('admin.results.student'), render: (v, r) => h('span', null, h('b', null, v), h('div', { class: 'muted small' }, r.username)) }, { key: 'groupName', label: t('admin.users.group') },
      { key: 'examTitle', label: t('results.exam'), get: r => isAr() && r.examTitleAr ? r.examTitleAr : r.examTitle }, { key: 'kind', label: t('admin.results.filterKind'), render: v => badge(t('results.kind.' + v), v === 'exam' ? 'primary' : '') },
      { key: 'submittedAt', label: t('common.date'), render: v => fmt.datetime(v) }, { key: 'attemptNumber', label: t('exams.attemptNo') }, { key: 'score', label: t('exams.score'), render: (v, r) => `${v}/${r.total}` }, { key: 'percent', label: '%', render: v => fmt.pct(v, 1) },
      { key: 'passed', label: t('common.status'), render: v => badge(v ? t('exams.passed') : t('exams.failed'), v ? 'success' : 'danger') }, { key: 'durationSec', label: t('exams.time'), render: v => fmt.duration(v) },
    ] }));
    // per-student summary
    const by = new Map();
    for (const r of rows) { const b = by.get(r.userId) || { userId: r.userId, displayName: r.displayName, username: r.username, groupName: r.groupName, attempts: 0, best: 0, last: null, passed: 0 }; b.attempts++; b.best = Math.max(b.best, r.percent); if (!b.last || r.submittedAt > b.last) b.last = r.submittedAt; if (r.passed) b.passed++; by.set(r.userId, b); }
    const summary = [...by.values()];
    perStudentBox.replaceChildren(h('h3', null, t('admin.results.perStudent')), dataTable({ rows: summary, pageSize: 25, initialSort: { key: 'displayName', dir: 1 }, columns: [
      { key: 'displayName', label: t('admin.results.student') }, { key: 'username', label: t('admin.users.username') }, { key: 'groupName', label: t('admin.users.group') }, { key: 'attempts', label: t('admin.results.attempts') }, { key: 'best', label: t('admin.results.best'), render: v => fmt.pct(v, 1) }, { key: 'passed', label: t('exams.passed') }, { key: 'last', label: t('admin.results.last'), render: v => fmt.datetime(v) },
      { key: 'actions', label: t('common.actions'), sort: false, render: (_, s) => h('button', { class: 'btn sm', onClick: () => studentReport(s.userId) }, icon('file'), t('admin.results.studentReport')) },
    ] }));
  }
  async function studentReport(userId) {
    const u = users.find(x => x.id === userId); if (!u) return;
    const [attempts, sessions] = await Promise.all([api('attempts:query', { userId }), api('twin:sessions', { userId })]);
    try { const r = await api('export:pdf', { html: studentSummaryHtml(u, attempts, sessions), suggestedName: `report-${u.username}.pdf` }); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); } catch (err) { toast(t('common.exportFailed') + ': ' + errorMessage(err.code), 'error'); }
  }
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.results.title')), h('p', null, t('admin.results.intro'))),
    h('div', { class: 'flex' }, h('button', { class: 'btn', onClick: () => exportCsvRows(rows, 'results.csv') }, icon('download'), t('common.exportCsv')), h('button', { class: 'btn', onClick: async () => { try { const r = await api('export:json', { data: rows, suggestedName: 'results.json' }); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); } catch (err) { toast(errorMessage(err.code), 'error'); } } }, icon('download'), t('common.exportJson')))),
    h('div', { class: 'toolbar' }, selExam, selGroup, selUser, selKind), statsBox, chartsBox, tableBox, perStudentBox);
  for (const s of [selExam, selGroup, selUser, selKind]) s.addEventListener('change', load);
  await load();
  return () => charts.forEach(destroyChart);
}
