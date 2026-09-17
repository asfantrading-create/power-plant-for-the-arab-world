import { t, isAr, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { h, icon, badge, empty, confirmDialog, toast } from '../ui.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('exams.title'));
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('exams.available')))));
  const [list, mine] = await Promise.all([api('exams:list'), api('attempts:mine')]);
  if (!list.length) { container.append(empty(t('exams.noneAssigned'), 'exam')); return; }
  const grid = h('div', { class: 'grid cols-2' });
  for (const e of list) {
    const title = isAr() && e.titleAr ? e.titleAr : (e.title || e.titleAr);
    const open = mine.find(a => a.examId === e.id && !a.submittedAt);
    const used = e.attemptsUsed || 0;
    const exhausted = e.maxAttempts > 0 && used >= e.maxAttempts && !open;
    const best = mine.filter(a => a.examId === e.id && a.submittedAt).reduce((b, a) => Math.max(b, a.percent), null);
    grid.append(h('div', { class: 'card' },
      h('div', { class: 'flex between' }, h('h3', null, title), best !== null ? badge(`${t('admin.results.best')}: ${best}%`, best >= e.passMark ? 'success' : 'warning') : null),
      e.description ? h('p', { class: 'muted' }, e.description) : null,
      h('div', { class: 'facts' },
        h('div', { class: 'fact' }, h('span', null, t('exams.questions')), h('b', null, e.questionCount)),
        h('div', { class: 'fact' }, h('span', null, t('exams.duration')), h('b', null, `${e.durationMinutes} ${t('common.min')}`)),
        h('div', { class: 'fact' }, h('span', null, t('exams.passMark')), h('b', null, `${e.passMark}%`)),
        h('div', { class: 'fact' }, h('span', null, t('exams.attempts')), h('b', null, e.maxAttempts > 0 ? t('exams.attemptsUsed', { a: used, b: e.maxAttempts }) : `${used} · ${t('exams.unlimited')}`))),
      h('div', { class: 'mt' }, h('button', { class: 'btn primary', disabled: exhausted, onClick: async () => {
        if (!open && !(await confirmDialog(t('exams.startConfirm')))) return;
        try { const a = await api('attempts:start', { examId: e.id }); navigate(`/exam/${a.id}`); } catch (err) { toast(errorMessage(err.code), 'error'); }
      } }, icon('play'), open ? t('exams.resume') : t('exams.start')))));
  }
  container.append(grid);
}
