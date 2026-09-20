// Printable HTML reports (exam result / certificate, student summary) used for PDF export.
import { t, LT, isAr } from '../i18n.js';
import { escapeHtml as e, fmt } from '../ui.js';
import { state } from '../state.js';
import { BRAND } from './brand.js';

const BASE_CSS = `body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#13222f;margin:28px;font-size:13px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:18px 0 8px;border-bottom:2px solid #22b8cf;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cbd6e0;padding:6px 8px;text-align:start;vertical-align:top}th{background:#eef3f7}.muted{color:#5d7488}.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-weight:700}.pass{background:#d9f7e6;color:#127a45}.fail{background:#fde0e3;color:#a12030}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0c3d4e;padding-bottom:10px;margin-bottom:14px}.score{font-size:34px;font-weight:800;color:#0c3d4e}.q{margin:8px 0;padding:8px 10px;border:1px solid #e1e8ef;border-radius:8px;page-break-inside:avoid}.ok{color:#127a45}.bad{color:#a12030}.small{font-size:11px}.foot{margin-top:20px;font-size:11px;color:#5d7488;border-top:1px solid #cbd6e0;padding-top:6px}`;

function docWrap(title, body) {
  const dir = isAr() ? 'rtl' : 'ltr';
  return `<!DOCTYPE html><html lang="${isAr() ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8"><title>${e(title)}</title><style>${BASE_CSS}</style></head><body>${body}<div class="foot">${e(t('app.name'))} · ${e(state.settings?.institutionName || '')} · ${e(new Date().toLocaleString())}</div><div class="foot">${e(isAr() ? BRAND.nameAr : BRAND.nameEn)} · ${e(BRAND.email)} · WhatsApp ${e(BRAND.whatsapp)}</div></body></html>`;
}

export function attemptReportHtml(a) {
  const title = isAr() && a.examTitleAr ? a.examTitleAr : (a.examTitle || a.examTitleAr);
  const rows = (a.questions || []).map((q, i) => {
    const ans = q.answer; const hasKey = typeof q.correct === 'number';
    const ok = hasKey ? ans === q.correct : null;
    return `<div class="q"><b>${i + 1}. ${e(LT(q.prompt))}</b>${q.generated ? ` <span class="small muted">(${e(t('exams.generatedQ'))})</span>` : ''}<br>
      <span class="${ok === null ? '' : ok ? 'ok' : 'bad'}">${e(t('exams.yourAnswer'))}: ${ans === null || ans === undefined ? '—' : e(LT(q.options[ans]))}</span>
      ${hasKey && !ok ? `<br><span class="ok">${e(t('exams.correctAnswer'))}: ${e(LT(q.options[q.correct]))}</span>` : ''}
      ${q.explanation ? `<div class="small muted">${e(LT(q.explanation))}</div>` : ''}</div>`;
  }).join('');
  const topics = Object.entries(a.byTopic || {}).map(([k, v]) => `<tr><td>${e(topicLabel(k))}</td><td>${v.correct} / ${v.total}</td><td>${fmt.pct(v.correct / v.total * 100)}</td></tr>`).join('');
  const body = `<div class="head"><div><h1>${e(t('exams.result'))}: ${e(title)}</h1><div class="muted">${e(a.displayName || '')} (${e(a.username || '')}) · ${e(fmt.datetime(a.submittedAt))} · ${e(t('exams.attemptNo'))} ${a.attemptNumber || 1}</div></div>
    <div style="text-align:center"><div class="score">${fmt.pct(a.percent, 1)}</div><span class="badge ${a.passed ? 'pass' : 'fail'}">${e(a.passed ? t('exams.passed') : t('exams.failed'))}</span></div></div>
    <table><tr><th>${e(t('exams.score'))}</th><th>${e(t('exams.passMark'))}</th><th>${e(t('exams.time'))}</th><th>${e(t('results.exam'))}</th></tr><tr><td>${a.score} / ${a.total}</td><td>${a.passMark}%</td><td>${e(fmt.duration(a.durationSec))}</td><td>${e(t('results.kind.' + (a.kind || 'exam')))}</td></tr></table>
    ${topics ? `<h2>${e(t('exams.byTopic'))}</h2><table><tr><th>${e(t('exams.topics'))}</th><th>${e(t('exams.score'))}</th><th>%</th></tr>${topics}</table>` : ''}
    <h2>${e(t('exams.review'))}</h2>${rows}`;
  return docWrap(title, body);
}

export function topicLabel(k) {
  const bank = state.cache.topics || {};
  if (bank[k]) return LT(bank[k]);
  const tk = state.dataset?.technologies?.[k];
  if (tk) return isAr() ? tk.nameAr : tk.nameEn;
  return k;
}

export function studentSummaryHtml(user, attempts, sessions) {
  const rows = attempts.map(a => `<tr><td>${e(isAr() && a.examTitleAr ? a.examTitleAr : a.examTitle)}</td><td>${e(t('results.kind.' + (a.kind || 'exam')))}</td><td>${e(fmt.datetime(a.submittedAt))}</td><td>${a.score}/${a.total}</td><td>${fmt.pct(a.percent, 1)}</td><td><span class="badge ${a.passed ? 'pass' : 'fail'}">${e(a.passed ? t('exams.passed') : t('exams.failed'))}</span></td></tr>`).join('');
  const srows = (sessions || []).map(s => `<tr><td>${e(s.plantName)}</td><td>${e(fmt.datetime(s.startedAt))}</td><td>${e(fmt.duration(s.durationSec))}</td><td>${fmt.num(s.kpis?.energyMwh, 1)} MWh</td><td>${fmt.pct((s.kpis?.capacityFactor || 0) * 100)}</td><td>${s.kpis?.trips ?? 0}</td></tr>`).join('');
  const exams = attempts.filter(a => a.kind !== 'practice');
  const mean = exams.length ? exams.reduce((x, a) => x + a.percent, 0) / exams.length : 0;
  const body = `<div class="head"><div><h1>${e(t('admin.results.studentReport'))}: ${e(user.displayName || user.username)}</h1><div class="muted">${e(user.username)}${user.studentNumber ? ' · ' + e(user.studentNumber) : ''}</div></div><div style="text-align:center"><div class="score">${fmt.pct(mean, 1)}</div><div class="small muted">${e(t('dash.avg'))} (${exams.length} ${e(t('dash.attempts'))})</div></div></div>
    <h2>${e(t('results.title'))}</h2><table><tr><th>${e(t('results.exam'))}</th><th>${e(t('admin.results.filterKind'))}</th><th>${e(t('common.date'))}</th><th>${e(t('exams.score'))}</th><th>%</th><th>${e(t('common.status'))}</th></tr>${rows || `<tr><td colspan="6">${e(t('results.none'))}</td></tr>`}</table>
    ${srows ? `<h2>${e(t('admin.sessions.title'))}</h2><table><tr><th>${e(t('admin.sessions.plant'))}</th><th>${e(t('common.date'))}</th><th>${e(t('admin.sessions.duration'))}</th><th>${e(t('admin.sessions.energy'))}</th><th>${e(t('admin.sessions.cf'))}</th><th>${e(t('admin.sessions.trips'))}</th></tr>${srows}</table>` : ''}`;
  return docWrap(user.displayName || user.username, body);
}
