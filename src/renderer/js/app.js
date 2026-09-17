// Application entry: boot sequence, routing and the main shell (sidebar + topbar).
import { t, setLang, lang, L, isAr } from './i18n.js';
import { api, onEvent } from './api.js';
import { state, setState, isRole, hasModule } from './state.js';
import { h, clear, icon, toast, fmt, progress } from './ui.js';
import * as pages from './pages/index.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const ROUTES = [
  { re: /^\/?$/, page: 'dashboard' },
  { re: /^\/dashboard$/, page: 'dashboard' },
  { re: /^\/plants$/, page: 'plants' },
  { re: /^\/plant\/([^/]+)$/, page: 'plant', params: ['id'] },
  { re: /^\/twin\/([^/]+)$/, page: 'twin', params: ['id'], module: 'twin' },
  { re: /^\/exams$/, page: 'exams', module: 'exams' },
  { re: /^\/exam\/([^/]+)$/, page: 'examRun', params: ['attemptId'], module: 'exams' },
  { re: /^\/practice$/, page: 'practice', module: 'exams' },
  { re: /^\/results$/, page: 'results', module: 'exams' },
  { re: /^\/result\/([^/]+)$/, page: 'result', params: ['id'], module: 'exams' },
  { re: /^\/profile$/, page: 'profile' },
  { re: /^\/about$/, page: 'about' },
  { re: /^\/admin\/users$/, page: 'adminUsers', role: 'instructor' },
  { re: /^\/admin\/groups$/, page: 'adminGroups', role: 'instructor' },
  { re: /^\/admin\/exams$/, page: 'adminExams', role: 'instructor', module: 'exams' },
  { re: /^\/admin\/results$/, page: 'adminResults', role: 'instructor', module: 'exams' },
  { re: /^\/admin\/sessions$/, page: 'adminSessions', role: 'instructor', module: 'twin' },
  { re: /^\/admin\/license$/, page: 'adminLicense', role: 'superadmin' },
  { re: /^\/admin\/settings$/, page: 'adminSettings', role: 'superadmin' },
  { re: /^\/admin\/updates$/, page: 'adminUpdates', role: 'student' },
  { re: /^\/admin\/workspace$/, page: 'adminWorkspace', role: 'superadmin' },
  { re: /^\/admin\/audit$/, page: 'adminAudit', role: 'superadmin' },
];

const NAV = [
  { section: 'nav.learn' },
  { path: '/dashboard', label: 'nav.dashboard', icon: 'dashboard' },
  { path: '/plants', label: 'nav.plants', icon: 'map' },
  { path: '/exams', label: 'nav.exams', icon: 'exam', module: 'exams' },
  { path: '/practice', label: 'nav.practice', icon: 'practice', module: 'exams' },
  { path: '/results', label: 'nav.results', icon: 'results', module: 'exams' },
  { section: 'nav.admin', role: 'instructor' },
  { path: '/admin/users', label: 'nav.users', icon: 'users', role: 'instructor' },
  { path: '/admin/groups', label: 'nav.groups', icon: 'group', role: 'instructor' },
  { path: '/admin/exams', label: 'nav.examsAdmin', icon: 'exam', role: 'instructor', module: 'exams' },
  { path: '/admin/results', label: 'nav.resultsAdmin', icon: 'results', role: 'instructor', module: 'exams' },
  { path: '/admin/sessions', label: 'nav.sessions', icon: 'twin', role: 'instructor', module: 'twin' },
  { section: 'nav.system' },
  { path: '/admin/license', label: 'nav.license', icon: 'key', role: 'superadmin' },
  { path: '/admin/settings', label: 'nav.settings', icon: 'settings', role: 'superadmin' },
  { path: '/admin/workspace', label: 'nav.workspace', icon: 'database', role: 'superadmin' },
  { path: '/admin/audit', label: 'nav.audit', icon: 'log', role: 'superadmin' },
  { path: '/admin/updates', label: 'nav.updates', icon: 'update' },
  { path: '/profile', label: 'nav.profile', icon: 'user' },
  { path: '/about', label: 'nav.about', icon: 'info' },
];

const root = document.getElementById('app');
let currentCleanup = null;
let shellEls = null;

export function navigate(path) { location.hash = '#' + path; }
export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = {};
  if (qs) for (const part of qs.split('&')) { const [k, v] = part.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); }
  return { path, query };
}

export function applyTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
}

export async function setLanguage(l) {
  setLang(l); state.lang = l;
  try { await api('settings:set', { key: 'language', value: l }); } catch { /* not critical */ }
  rerender();
}
export async function toggleTheme() {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { await api('settings:set', { key: 'theme', value: next }); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('themechange'));
}

async function ensureDataset() {
  if (state.dataset) return state.dataset;
  const ds = await api('data:dataset');
  setState({ dataset: ds, cache: {} });
  return ds;
}
export async function ensureMap() {
  if (state.map) return state.map;
  const m = await api('data:map');
  setState({ map: m });
  return m;
}

export async function reloadBoot() {
  const b = await api('app:bootstrap');
  setState({ boot: b, settings: b.settings, license: b.license, updater: b.updater, user: b.currentUser });
  return b;
}

export function rerender() { start(); }

export async function logout() {
  try { await api('auth:logout'); } catch { /* ignore */ }
  if (currentCleanup) { try { currentCleanup(); } catch { /* ignore */ } currentCleanup = null; }
  setState({ user: null });
  location.hash = '#/';
  start();
}

function langSwitch() {
  return h('div', { class: 'btn-group' },
    h('button', { class: `btn sm ${isAr() ? 'active' : ''}`, onClick: () => setLanguage('ar') }, 'العربية'),
    h('button', { class: `btn sm ${!isAr() ? 'active' : ''}`, onClick: () => setLanguage('en') }, 'English'));
}

async function start() {
  if (currentCleanup) { try { currentCleanup(); } catch { /* ignore */ } currentCleanup = null; }
  shellEls = null;
  clear(root);
  const lic = state.license;
  const fullscreen = (content) => root.append(h('div', { class: 'fullscreen' }, h('div', { class: 'lang-switch' }, langSwitch()), content));
  if (!lic || !lic.valid) { fullscreen(pages.activation.render({ onActivated: async () => { await reloadBoot(); start(); } })); return; }
  if (state.boot.needsSetup) { fullscreen(pages.setup.render({ onDone: async () => { await reloadBoot(); start(); } })); return; }
  if (!state.user) { fullscreen(pages.login.render({ onLogin: async () => { await reloadBoot(); start(); } })); return; }
  try { await ensureDataset(); } catch (err) { root.append(h('div', { class: 'fullscreen' }, h('div', { class: 'alert error' }, String(err.message)))); return; }
  renderShell();
  route();
}

function renderShell() {
  const user = state.user;
  const sidebar = h('aside', { class: 'sidebar' },
    h('div', { class: 'brand' }, h('img', { src: 'assets/logo.png', alt: '' }), h('div', null, h('b', null, t('app.short')), h('small', null, state.settings.institutionName || t('app.tagline')))),
    h('nav'),
    h('div', { class: 'footer' }, `v${APP_VERSION} · ${state.dataset.plants.length} ${t('dash.plants')}`));
  const nav = sidebar.querySelector('nav');
  for (const item of NAV) {
    if (item.role && !isRole(item.role)) continue;
    if (item.module && !hasModule(item.module)) continue;
    if (item.section) { nav.append(h('div', { class: 'section' }, t(item.section))); continue; }
    nav.append(h('a', { href: '#' + item.path, dataset: { path: item.path } }, icon(item.icon), t(item.label)));
  }
  nav.append(h('a', { href: '#', onClick: e => { e.preventDefault(); logout(); } }, icon('logout'), t('nav.logout')));
  const initials = (user.displayName || user.username).trim().slice(0, 1).toUpperCase();
  const topbar = h('header', { class: 'topbar' },
    h('div', { class: 'title' }),
    h('div', { class: 'spacer' }),
    langSwitch(),
    h('button', { class: 'btn ghost sm', title: t('common.theme'), onClick: toggleTheme }, state.theme === 'dark' ? '☀' : '☾'),
    h('a', { href: '#/profile', class: 'user-chip' }, h('div', { class: 'avatar' }, initials), h('div', null, h('span', null, user.displayName || user.username), h('small', null, t('role.' + user.role)))));
  const banner = h('div', { class: 'update-banner hidden' });
  const content = h('main', { class: 'content' });
  const main = h('div', { style: { display: 'flex', flexDirection: 'column', overflow: 'hidden' } }, banner, content);
  const shell = h('div', { class: 'shell' }, sidebar, topbar, main);
  root.append(shell);
  shellEls = { nav, title: topbar.querySelector('.title'), content, banner };
  renderUpdateBanner();
}

export function renderUpdateBanner() {
  if (!shellEls) return;
  const u = state.updater; const b = shellEls.banner;
  clear(b);
  if (!u || !['available', 'downloading', 'downloaded'].includes(u.status) || b.dataset.dismissed === u.version + u.status) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  b.append(icon('update'));
  if (u.status === 'available') b.append(h('span', null, t('updates.available', { v: u.version })), h('button', { class: 'btn sm primary', onClick: () => api('updater:download') }, t('updates.download')), h('button', { class: 'btn sm ghost', onClick: () => { b.dataset.dismissed = u.version + u.status; renderUpdateBanner(); } }, t('updates.later')));
  else if (u.status === 'downloading') b.append(h('span', null, t('updates.downloading', { p: u.progress ? u.progress.percent : 0 })), progress(u.progress ? u.progress.percent : 0));
  else if (u.status === 'downloaded') b.append(h('span', null, t('updates.downloaded', { v: u.version })), h('button', { class: 'btn sm primary', onClick: () => api('updater:install') }, t('updates.install')));
}

async function route() {
  if (!shellEls) return;
  const { path, query } = parseHash();
  let match = null, params = { ...query };
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (m) { match = r; (r.params || []).forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); }); break; }
  }
  if (!match || (match.role && !isRole(match.role)) || (match.module && !hasModule(match.module))) { navigate('/dashboard'); return; }
  if (state.user.mustChangePassword && match.page !== 'profile' && match.page !== 'about') { navigate('/profile?mustChange=1'); return; }
  if (currentCleanup) { try { currentCleanup(); } catch { /* ignore */ } currentCleanup = null; }
  state.route = { name: match.page, params };
  for (const a of shellEls.nav.querySelectorAll('a[data-path]')) a.classList.toggle('active', path === a.dataset.path || (a.dataset.path !== '/dashboard' && path.startsWith(a.dataset.path + '/')) || (a.dataset.path === '/plants' && (path.startsWith('/plant/') || path.startsWith('/twin/'))));
  clear(shellEls.content);
  shellEls.content.className = 'content' + (match.page === 'twin' || match.page === 'plants' ? ' no-pad' : '');
  shellEls.content.scrollTop = 0;
  const page = pages[match.page];
  try {
    const cleanup = await page.render(shellEls.content, params, { setTitle: s => { shellEls.title.textContent = s; } });
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } catch (err) {
    console.error(err);
    shellEls.content.append(h('div', { class: 'alert error' }, `${t('common.error')}: ${err.message}`));
  }
}

async function boot() {
  try {
    const b = await reloadBoot();
    setLang(b.settings.language || 'ar'); state.lang = lang();
    applyTheme(b.settings.theme || 'dark');
    onEvent('updater:event', s => {
      const prev = state.updater; setState({ updater: s });
      renderUpdateBanner();
      if (s.status === 'available' && (!prev || prev.status !== 'available')) toast(t('updates.available', { v: s.version }), 'info', 6000);
      if (s.status === 'downloaded') toast(t('updates.downloaded', { v: s.version }), 'success', 6000);
    });
    onEvent('workspace:changed', async () => { await reloadBoot(); setState({ user: null }); toast(t('admin.settings.workspaceChanged'), 'warning'); start(); });
    window.addEventListener('hashchange', route);
    await start();
  } catch (err) {
    clear(root);
    root.append(h('div', { class: 'fullscreen' }, h('div', { class: 'alert error' }, 'Failed to start: ' + err.message)));
  }
}
boot();
