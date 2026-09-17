import { t, LT, isAr, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { h, clear, icon, toast, confirmDialog, fmt, badge } from '../ui.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  const a = await api('attempts:get', { id: params.attemptId });
  if (!a.inProgress) { navigate(`/result/${a.id}`); return; }
  const title = isAr() && a.examTitleAr ? a.examTitleAr : (a.examTitle || a.examTitleAr);
  ctx.setTitle(title);
  const answers = a.answers.slice();
  let idx = 0, submitted = false, dirty = false;
  const timer = h('div', { class: 'timer num' });
  const status = h('span', { class: 'muted small' });
  const nav = h('div', { class: 'qnav' });
  const qbox = h('div');
  const progressTxt = h('div', { class: 'muted small' });
  const wrap = h('div', { class: 'exam-run' },
    h('div', { class: 'card flex between mb' }, h('div', null, h('h2', { style: { margin: 0 } }, title), progressTxt), h('div', { class: 'flex' }, status, h('span', { class: 'muted small' }, t('exams.timeLeft')), timer)),
    h('div', { class: 'card mb' }, nav), qbox,
    h('div', { class: 'flex between mt' }, h('button', { class: 'btn', onClick: () => go(idx - 1) }, t('common.previous')), h('button', { class: 'btn', onClick: () => go(idx + 1) }, t('common.next')), h('div', { class: 'grow' }), h('button', { class: 'btn primary lg', onClick: submit }, icon('check'), t('exams.submit'))));
  container.append(wrap);

  const deadline = new Date(a.deadlineAt).getTime();
  const tick = setInterval(() => {
    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    timer.textContent = fmt.clock(left); timer.classList.toggle('warn', left < 120);
    if (left <= 0 && !submitted) { submitted = true; clearInterval(tick); api('attempts:submit', { attemptId: a.id, answers }).then(r => { toast(t('exams.timeUp'), 'warning', 6000); navigate(`/result/${r.id}`); }).catch(err => toast(errorMessage(err.code), 'error')); }
  }, 500);
  const autosave = setInterval(async () => { if (dirty && !submitted) { dirty = false; try { await api('attempts:save', { attemptId: a.id, answers }); status.textContent = t('exams.autoSaved'); setTimeout(() => { status.textContent = ''; }, 2000); } catch { /* ignore */ } } }, 4000);

  function renderNav() {
    clear(nav);
    a.questions.forEach((q, i) => nav.append(h('button', { class: `${answers[i] !== null ? 'answered' : ''} ${i === idx ? 'current' : ''}`, onClick: () => go(i) }, i + 1)));
    const done = answers.filter(x => x !== null).length;
    progressTxt.textContent = t('exams.answered', { a: done, n: a.questions.length });
  }
  function go(i) { if (i < 0 || i >= a.questions.length) return; idx = i; renderQ(); renderNav(); window.scrollTo(0, 0); }
  function renderQ() {
    const q = a.questions[idx];
    clear(qbox);
    qbox.append(h('div', { class: 'question' },
      h('div', { class: 'flex between' }, h('div', { class: 'muted small' }, t('exams.question', { i: idx + 1, n: a.questions.length })), q.generated ? badge(t('exams.generatedQ'), 'primary') : null),
      h('div', { class: 'q' }, LT(q.prompt)),
      q.options.map((o, oi) => h('div', { class: `option ${answers[idx] === oi ? 'selected' : ''}`, onClick: () => { answers[idx] = oi; dirty = true; renderQ(); renderNav(); } }, h('span', { class: 'letter' }, String.fromCharCode(65 + oi)), h('span', null, LT(o))))));
  }
  async function submit() {
    const missing = answers.filter(x => x === null).length;
    if (missing && !(await confirmDialog(t('exams.submitConfirm', { n: missing })))) return;
    if (submitted) return; submitted = true;
    try { const r = await api('attempts:submit', { attemptId: a.id, answers }); navigate(`/result/${r.id}`); } catch (err) { submitted = false; toast(errorMessage(err.code), 'error'); }
  }
  renderNav(); renderQ();
  return () => { clearInterval(tick); clearInterval(autosave); if (dirty && !submitted) api('attempts:save', { attemptId: a.id, answers }).catch(() => {}); };
}
