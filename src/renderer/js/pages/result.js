import { t, LT, isAr, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { h, icon, badge, fmt, toast, progress } from '../ui.js';
import { attemptReportHtml, topicLabel } from '../lib/report.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  const a = await api('attempts:get', { id: params.id });
  if (a.inProgress) { navigate(`/exam/${a.id}`); return; }
  if (!state.cache.topics) { try { const info = await api('data:questionBankInfo'); state.cache.topics = info.topics; } catch { state.cache.topics = {}; } }
  const title = isAr() && a.examTitleAr ? a.examTitleAr : (a.examTitle || a.examTitleAr);
  ctx.setTitle(`${t('exams.result')}: ${title}`);
  const exportBtn = async (kind) => {
    try { const r = await api(kind === 'pdf' ? 'export:pdf' : 'export:html', { html: attemptReportHtml(a), suggestedName: `result-${a.username}-${(a.submittedAt || '').slice(0, 10)}.${kind}` }); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); }
    catch (err) { toast(t('common.exportFailed') + ': ' + errorMessage(err.code), 'error'); }
  };
  const ring = h('div', { class: 'score-ring', style: { '--p': a.percent, '--c': a.passed ? 'var(--success)' : 'var(--danger)' } }, h('b', null, fmt.pct(a.percent, 1)));
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, title), h('p', null, `${a.displayName} · ${fmt.datetime(a.submittedAt)} · ${t('exams.attemptNo')} ${a.attemptNumber}`)),
    h('div', { class: 'flex' }, h('button', { class: 'btn', onClick: () => exportBtn('pdf') }, icon('file'), t('common.exportPdf')), h('button', { class: 'btn', onClick: () => exportBtn('html') }, icon('download'), 'HTML'))),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card flex gap-lg' }, ring, h('div', null, badge(a.passed ? t('exams.passed') : t('exams.failed'), a.passed ? 'success' : 'danger'), h('dl', { class: 'kv mt' }, h('dt', null, t('exams.score')), h('dd', null, `${a.score} / ${a.total}`), h('dt', null, t('exams.passMark')), h('dd', null, `${a.passMark}%`), h('dt', null, t('exams.time')), h('dd', null, fmt.duration(a.durationSec)), a.late ? [h('dt', null, t('common.status')), h('dd', null, t('exams.late'))] : null))),
      h('div', { class: 'card' }, h('h3', null, t('exams.byTopic')), Object.entries(a.byTopic || {}).map(([k, v]) => h('div', { style: { marginBottom: '8px' } }, h('div', { class: 'flex between small' }, h('span', null, topicLabel(k)), h('span', { class: 'num' }, `${v.correct}/${v.total}`)), progress(v.correct / v.total * 100, v.correct / v.total >= .6 ? 'success' : 'danger'))))));
  const review = h('div', { class: 'mt' }, h('h2', null, t('exams.review')));
  a.questions.forEach((q, i) => {
    const hasKey = typeof q.correct === 'number';
    review.append(h('div', { class: 'question' },
      h('div', { class: 'flex between' }, h('span', { class: 'muted small' }, `${i + 1} / ${a.questions.length}`), hasKey ? badge(q.answer === q.correct ? '✓' : '✗', q.answer === q.correct ? 'success' : 'danger') : null),
      h('div', { class: 'q' }, LT(q.prompt)),
      q.options.map((o, oi) => h('div', { class: `option ${hasKey && oi === q.correct ? 'correct' : ''} ${oi === q.answer && hasKey && oi !== q.correct ? 'wrong' : ''} ${oi === q.answer && !hasKey ? 'selected' : ''}` }, h('span', { class: 'letter' }, String.fromCharCode(65 + oi)), h('span', null, LT(o)))),
      q.explanation ? h('div', { class: 'alert info small', style: { marginTop: '8px', marginBottom: 0 } }, h('b', null, t('exams.explanation') + ': '), LT(q.explanation)) : null));
  });
  container.append(review);
}
