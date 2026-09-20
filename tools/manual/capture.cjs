#!/usr/bin/env node
/**
 * Screenshot tour used to illustrate the user manuals (docs/manual). Runs the real renderer bundle in headless
 * Chromium against the real IPC handlers on a temporary workspace, in Arabic and English, light theme.
 *
 *   npm run build:renderer && node tools/manual/capture.cjs [outDir] [ar,en]
 *
 * Requires Playwright with Chromium (npm i -g playwright && npx playwright install chromium).
 */
const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.tmp', 'manual-shots'));
const LANGS = (process.argv[3] || 'ar,en').split(',');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const { buildMainContext } = require(path.join(ROOT, 'test/helpers-ipc.js'));
const { tmpDir } = require(path.join(ROOT, 'test/helpers.js'));
const HARNESS = path.join(ROOT, 'src/renderer/.manual-harness.html');
fs.writeFileSync(HARNESS, fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''));
const T = {
  ar: { org: 'جامعة الملك سعود', admin: 'د. هيا وليد', groupA: 'الشعبة أ', groupB: 'الشعبة ب', student: i => `طالب ${i}`, exam1: ['اختبار منتصف الفصل – محطات الطاقة', 'Midterm – Power plants'], exam2: ['اختبار قصير – الطاقة المتجددة', 'Quiz – Renewable energy'], desc: 'يغطي الاختبار تقنيات التوليد وبيانات المحطات العربية.' },
  en: { org: 'King Saud University', admin: 'Dr. Haya Waleed', groupA: 'Section A', groupB: 'Section B', student: i => `Student ${i}`, exam1: ['اختبار منتصف الفصل – محطات الطاقة', 'Midterm – Power plants'], exam2: ['اختبار قصير – الطاقة المتجددة', 'Quiz – Renewable energy'], desc: 'The exam covers generation technologies and Arab plant data.' },
};
async function tour(lang) {
  const L = T[lang]; const dir = path.join(OUT, lang); fs.mkdirSync(dir, { recursive: true });
  const ws = tmpDir(); const ctx = buildMainContext(ws);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.exposeBinding('__invoke', async (_s, channel, payload) => (ctx.handlers[channel] ? ctx.handlers[channel]({}, payload) : { ok: false, error: 'no_handler:' + channel }));
  await page.addInitScript(() => {
    window.__listeners = {}; window.api = { invoke: (c, p) => window.__invoke(c, p), on: (ch, cb) => { (window.__listeners[ch] = window.__listeners[ch] || []).push(cb); return () => {}; } };
    new MutationObserver(() => { const h = document.documentElement; if (h && h.dataset.theme === 'dark') h.dataset.theme = 'light'; }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] });
  });
  let n = 0;
  const shot = async (name, o = {}) => { if (o.bottom) { await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTop = 1e6; }); await page.waitForTimeout(250); } await page.screenshot({ path: path.join(dir, `${String(++n).padStart(2, '0')}-${name}.jpg`), type: 'jpeg', quality: 84 }); console.log(lang, n, name); };
  const go = async (route, ms = 1000) => { await page.evaluate(r => { window.location.hash = '#' + r; }, route); await page.waitForTimeout(ms); };
  const clickText = async (sel, re, ms = 600) => { const ok = await page.evaluate(([s, r]) => { const rx = new RegExp(r); const el = [...document.querySelectorAll(s)].find(e => rx.test(e.textContent.trim())); if (el) { el.click(); return true; } return false; }, [sel, re.source]); await page.waitForTimeout(ms); return ok; };
  const closeModal = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); };
  const confirmModal = async () => { await page.evaluate(() => { const b = [...document.querySelectorAll('.modal footer .btn')].find(x => /primary|danger/.test(x.className)); if (b) b.click(); }); await page.waitForTimeout(700); };
  // ---- activation ----
  await page.goto('file://' + HARNESS); await page.waitForSelector('.auth-card', { timeout: 30000 }); await page.waitForTimeout(500);
  if (lang === 'en') await clickText('.lang-switch button', /^English$/, 500);
  await page.fill('.auth-card textarea', ctx.validKey); await page.waitForTimeout(200);
  await shot('activation');
  await page.click('.auth-card .btn.primary'); await page.waitForTimeout(700);
  // ---- setup ----
  const inputs = await page.$$('.auth-card input'); await inputs[0].fill(L.org); await inputs[1].fill('admin'); await inputs[2].fill(L.admin); await inputs[3].fill('Admin@2026'); await inputs[4].fill('Admin@2026');
  await shot('setup');
  await page.click('.auth-card button[type=submit]'); await page.waitForSelector('.shell', { timeout: 30000 }); await page.waitForTimeout(600);
  await page.click('.topbar button[title]'); await page.waitForTimeout(300); // light theme (state + setting)
  // ---- seed data through the real services ----
  const gA = ctx.store.put('groups', { id: 'g-a', name: L.groupA }), gB = ctx.store.put('groups', { id: 'g-b', name: L.groupB });
  const students = [];
  for (let i = 1; i <= 10; i++) students.push(ctx.auth.createUser({ username: `student${String(i).padStart(2, '0')}`, password: 'Student@1', displayName: L.student(i), role: 'student', groupId: i <= 6 ? gA.id : gB.id, studentNumber: `4410${String(i).padStart(2, '0')}` }));
  ctx.auth.createUser({ username: 'instructor1', password: 'Teach@2026', displayName: lang === 'ar' ? 'م. سامي خالد' : 'Eng. Sami Khaled', role: 'instructor' });
  const ex1 = await ctx.handlers['exams:create']({}, { title: L.exam1[1], titleAr: L.exam1[0], description: L.desc, topics: ['general', 'thermal', 'pv', 'wind'], questionCount: 10, generatedShare: 0.4, durationMinutes: 30, passMark: 60, maxAttempts: 2, groupIds: [gA.id, gB.id], showAnswers: true });
  const ex2 = await ctx.handlers['exams:create']({}, { title: L.exam2[1], titleAr: L.exam2[0], topics: ['pv', 'csp', 'wind', 'hydro'], questionCount: 8, generatedShare: 0.5, durationMinutes: 15, passMark: 50, maxAttempts: 0, groupIds: [gA.id] });
  if (!ex1.ok || !ex2.ok) console.log('exam seed failed', ex1.error, ex2.error);
  const rnd = (s => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; })(7);
  for (let i = 1; i <= 8; i++) {
    ctx.auth.login(`student${String(i).padStart(2, '0')}`, 'Student@1');
    const st = await ctx.handlers['attempts:start']({}, { examId: ex1.data.id });
    if (st.ok) { const rec = ctx.store.get('attempts', st.data.id); const qs = (rec && rec.questions) || []; const good = [0.9, 0.85, 0.75, 0.7, 0.65, 0.55, 0.45, 0.35][i - 1]; const answers = qs.map(q => { const c = typeof q.correct === 'number' ? q.correct : 0; if (rnd() < good) return c; let w = Math.floor(rnd() * 4); if (w === c) w = (c + 1) % 4; return w; }); await ctx.handlers['attempts:submit']({}, { attemptId: st.data.id, answers }); }
    if (i <= 3) { const pr = await ctx.handlers['practice:start']({}, { count: 5, topics: ['pv', 'wind'] }); if (pr.ok) await ctx.handlers['attempts:submit']({}, { attemptId: pr.data.id, answers: [0, 1, 2, 1, 0] }); }
    if (i <= 4) await ctx.handlers['twin:logSession']({}, { plantId: ['are-barakah', 'gppd-WRI1030705', 'gppd-WRI1000106', 'egy-benban-other'][i - 1], plantName: ['Barakah', 'Shuaibah', 'Aswan High Dam', 'Benban'][i - 1], startedAt: new Date(Date.now() - 3600e3 * i).toISOString(), durationSec: 900 + i * 300, kpis: { energyMwh: 1200 * i, capacityFactor: 0.6 + i * 0.05, availability: 0.97, trips: i % 2, co2Tonnes: 300 * i, simHours: 6 + i }, events: [{ t: Date.now(), level: 'info', text: 'Unit U1 synchronised to grid' }] });
  }
  ctx.auth.login('admin', 'Admin@2026');
  await go('/dashboard', 1200); await shot('dashboard'); await shot('dashboard-bottom', { bottom: true });
  await go('/plants', 1500); await shot('plants-list'); await clickText('.toolbar .btn-group button, .btn-group button', new RegExp(lang === 'ar' ? '^بطاقات$' : '^Cards$'), 900); await shot('plants-cards');
  await go('/plants?country=SAU&fuel=Gas', 1500); await shot('plants-filtered');
  await go('/plant/gppd-WRI1030705', 1200); await shot('plant'); await shot('plant-bottom', { bottom: true });
  await go('/twin/are-barakah', 14000); await shot('twin'); await clickText('.chip', new RegExp(lang === 'ar' ? 'فصل وحدة مفاجئ' : 'Sudden unit trip'), 3500); await shot('twin-scenario'); await shot('twin-bottom', { bottom: true });
  await go('/admin/users', 1200); await shot('admin-users'); await clickText('.content .btn', new RegExp(lang === 'ar' ? 'إضافة مستخدم' : 'Add user'), 600); await shot('admin-users-add'); await closeModal(); await clickText('.content .btn', new RegExp(lang === 'ar' ? 'استيراد طلاب' : 'Import students'), 600); await shot('admin-users-import'); await closeModal();
  await go('/admin/groups', 1200); await shot('admin-groups');
  await go('/admin/exams', 1200); await shot('admin-exams'); await clickText('.content .btn', new RegExp(lang === 'ar' ? 'اختبار جديد' : 'New exam'), 700); await shot('admin-exams-new'); await closeModal();
  await go('/admin/results', 1800); await shot('admin-results'); await shot('admin-results-bottom', { bottom: true });
  await go('/admin/sessions', 1200); await shot('admin-sessions');
  await go('/admin/license', 1200); await shot('admin-license');
  await go('/admin/settings', 1200); await shot('admin-settings');
  await go('/admin/workspace', 1200); await shot('admin-workspace');
  await go('/admin/audit', 1200); await shot('admin-audit');
  await go('/admin/updates', 1200); await shot('admin-updates');
  await go('/about', 1200); await shot('about'); await shot('about-bottom', { bottom: true });
  await go('/profile', 1200); await shot('profile');
  // ---- student ----
  await clickText('.sidebar nav a', new RegExp(lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'), 800);
  await page.waitForSelector('.auth-card', { timeout: 20000 }); const li = await page.$$('.auth-card input'); await li[0].fill('student09'); await li[1].fill('Student@1'); await shot('login');
  await page.click('.auth-card button[type=submit]'); await page.waitForSelector('.shell', { timeout: 20000 }); await page.waitForTimeout(800);
  await shot('student-dashboard');
  await go('/exams', 1200); await shot('student-exams');
  await clickText('.content .btn', new RegExp(lang === 'ar' ? 'بدء الاختبار' : 'Start exam'), 600); await confirmModal(); await page.waitForTimeout(1200); await shot('student-exam-run');
  await page.evaluate(() => { const opts = document.querySelectorAll('.question .option'); if (opts[1]) opts[1].click(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { const qs = document.querySelectorAll('.question'); if (qs[1]) { const o = qs[1].querySelectorAll('.option'); if (o[0]) o[0].click(); } }); await page.waitForTimeout(400); await shot('student-exam-answering');
  await clickText('.content .btn', new RegExp(lang === 'ar' ? 'تسليم الإجابات' : 'Submit answers'), 500); await confirmModal(); await page.waitForTimeout(1500); await shot('student-result'); await shot('student-result-bottom', { bottom: true });
  await go('/practice', 1200); await shot('student-practice'); await clickText('.content .btn', new RegExp(lang === 'ar' ? 'ابدأ التدريب' : 'Start practice'), 1500); await shot('student-practice-run');
  await go('/results', 1200); await shot('student-results');
  await go('/profile', 1200); await shot('student-profile');
  await browser.close();
}
(async () => { for (const lang of LANGS) await tour(lang); try { fs.unlinkSync(HARNESS); } catch { /* ignore */ } console.log('done ->', OUT); })().catch(e => { console.error('CAPTURE FAILED:', e); try { fs.unlinkSync(HARNESS); } catch { /* ignore */ } process.exit(1); });
