'use strict';
// ASFAN LMS link for ASFAN desktop programs (Electron digital twins) – main process, no dependencies.
//
// When Asfan Academy opens a program it passes the session on the command line:
//   --lms-api=http://127.0.0.1:47800 --lms-token=<token> --lms-attempt=<id> --lms-user=<name> --lms-lang=ar
// Without these arguments the link is inactive and the program behaves exactly as before.
//
// Main process:
//   const lms = require('./asfan-lms-link.cjs');
//   lms.install(ipcMain);                      // IPC channels for the renderer (see preload below)
//   lms.report({ title, score, maxScore, passed, correct, total, kind, student, data })   // from main code
//   app.on('second-instance', (e, argv) => lms.useArgs(argv));   // if the program is single-instance
// Preload (contextIsolation):
//   contextBridge.exposeInMainWorld('asfanLMS', {
//     report: r => ipcRenderer.invoke('asfan-lms:report', r), info: () => ipcRenderer.invoke('asfan-lms:info') });
// Renderer, where a test is finished:
//   window.asfanLMS && window.asfanLMS.report({ title, score, maxScore, passed, ... });
//
// Every finished test is sent as a 'score' event (POST /vr/v1/event). The platform shows it live and,
// when the program is closed, records the last test as the session result together with the usage time.
const VERSION = '1.0.0';
let session = parse(process.argv);
const queue = [];
let sending = false;
function parse(argv) {
  const get = k => { const p = `--${k}=`; const a = (argv || []).find(x => typeof x === 'string' && x.startsWith(p)); return a ? a.slice(p.length) : ''; };
  const api = get('lms-api').replace(/\/+$/, ''), token = get('lms-token');
  return api && token ? { api, token, attempt: get('lms-attempt'), user: get('lms-user'), lang: get('lms-lang') || 'ar' } : null;
}
function useArgs(argv) { const s = parse(argv); if (s) { session = s; send({ type: 'start', step: 'connected', data: { link: VERSION } }); } return !!s; }
const active = () => !!session;
const info = () => session ? { active: true, user: session.user, lang: session.lang, attempt: session.attempt } : { active: false };
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
// Normalises one finished test/quiz/exam/challenge into the event the platform expects.
function toEvent(r = {}) {
  let score = num(r.score), max = num(r.maxScore ?? r.max ?? r.total);
  const correct = num(r.correct), total = num(r.total);
  if (score == null && r.percent != null) { score = num(r.percent); max = 100; }
  if (score == null && correct != null && total) { score = correct; max = total; }
  if (score == null) return null;
  if (!max || max <= 0) max = 100;
  const percent = r.percent != null ? num(r.percent) : Math.round(score * 1000 / max) / 10;
  const passed = r.passed != null ? !!r.passed : (r.passMark != null ? percent >= Number(r.passMark) : undefined);
  const title = String(r.title || r.topic || r.kind || 'Test').slice(0, 200);
  return {
    type: 'score', score, maxScore: max, step: title,
    data: { title, kind: r.kind || 'test', score, maxScore: max, percent, passed, correct, total,
      student: r.student || undefined, at: new Date().toISOString(), details: r.data || undefined }
  };
}
function report(r) {
  if (!session) return { ok: false, active: false };
  const ev = toEvent(r);
  if (!ev) return { ok: false, error: 'no score' };
  send(ev);
  return { ok: true };
}
function send(ev) { if (!session) return; queue.push({ ...ev, token: session.token }); flush(); }
async function flush() {
  if (sending || !queue.length || !session) return;
  sending = true;
  try {
    while (queue.length) {
      const ev = queue[0];
      let ok = false;
      for (let i = 0; i < 4 && !ok; i++) {
        try {
          const res = await fetch(session.api + '/vr/v1/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) });
          ok = res.ok || res.status === 401 || res.status === 409;   // closed/unknown session: drop it
        } catch { await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
      }
      queue.shift();
    }
  } finally { sending = false; }
}
function install(ipcMain) {
  if (!ipcMain || install.done) return;
  install.done = true;
  ipcMain.handle('asfan-lms:report', (_e, r) => report(r));
  ipcMain.handle('asfan-lms:info', () => info());
}
if (session) send({ type: 'start', step: 'connected', data: { link: VERSION } });
module.exports = { VERSION, active, info, report, install, useArgs, toEvent };
