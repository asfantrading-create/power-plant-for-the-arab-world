// DOM helpers, icons, formatting, toasts, modals and a sortable/paged data table.
import { t, lang, isAr } from './i18n.js';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string' && k !== 'value') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function svg(pathsOrHtml, viewBox = '0 0 24 24') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', viewBox); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = pathsOrHtml;
  return s;
}
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  map: '<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z"/><path d="M8 2v16M16 6v16"/>',
  plant: '<path d="M3 21h18"/><path d="M5 21V7l4-2v16"/><path d="M13 21V3l6 3v15"/><path d="M9 9h4M9 13h4M9 17h4"/>',
  twin: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  exam: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  practice: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  results: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  group: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  update: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  wind: '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>',
  water: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  play: '<path d="M5 3l14 9-14 9V3z"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
  cube: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
};
export function icon(name) { return svg(ICONS[name] || ICONS.info); }

export const fmt = {
  num(n, d = 0) { if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'; return Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 }); },
  mw(n, d = 0) { return n === null || n === undefined ? '—' : `${fmt.num(n, d)} ${t('common.mw')}`; },
  gw(n) { return `${fmt.num(n / 1000, 1)} GW`; },
  pct(n, d = 0) { return n === null || n === undefined ? '—' : `${fmt.num(n, d)}%`; },
  date(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString(isAr() ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return iso; } },
  datetime(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleString(isAr() ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } },
  duration(sec) { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; },
  clock(sec) { return fmt.duration(sec); },
  bytes(b) { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024))); return `${(b / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`; },
};

export function toast(message, type = 'info', ms = 3500) {
  const root = document.getElementById('toasts');
  const el = h('div', { class: `toast ${type}` }, message);
  root.append(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
  return el;
}

export function modal({ title, body, actions = [], wide = false, onClose }) {
  const root = document.getElementById('modal-root');
  let closed = false;
  const close = () => { if (closed) return; closed = true; backdrop.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const footer = actions.length ? h('footer', null, actions.map(a => h('button', { class: `btn ${a.class || ''}`, onClick: async () => { if (a.onClick) { const r = await a.onClick(); if (r === false) return; } if (a.close !== false) close(); } }, a.label))) : null;
  const box = h('div', { class: `modal ${wide ? 'wide' : ''}`, onClick: e => e.stopPropagation() },
    h('header', null, h('h3', null, title), h('button', { class: 'btn ghost sm', onClick: close }, icon('x'))),
    h('div', { class: 'body' }, body), footer);
  const backdrop = h('div', { class: 'modal-backdrop', onClick: close }, box);
  root.append(backdrop);
  document.addEventListener('keydown', onKey);
  return { close, box };
}
export function confirmDialog(message, { danger = false, okLabel } = {}) {
  return new Promise(resolve => {
    modal({ title: t('common.confirm'), body: h('p', null, message), onClose: () => resolve(false), actions: [
      { label: t('common.cancel'), class: 'ghost', onClick: () => resolve(false) },
      { label: okLabel || t('common.ok'), class: danger ? 'danger' : 'primary', onClick: () => resolve(true) },
    ] });
  });
}
export function promptDialog(title, { label, value = '', type = 'text', placeholder } = {}) {
  return new Promise(resolve => {
    const input = h('input', { type, value, placeholder });
    modal({ title, body: h('label', { class: 'field' }, h('span', null, label || ''), input), onClose: () => resolve(null), actions: [
      { label: t('common.cancel'), class: 'ghost', onClick: () => resolve(null) },
      { label: t('common.ok'), class: 'primary', onClick: () => resolve(input.value) },
    ] });
    setTimeout(() => input.focus(), 50);
  });
}

export function field(label, input, help) { return h('label', { class: 'field' }, h('span', null, label), input, help ? h('div', { class: 'help' }, help) : null); }
export function selectEl(options, value, attrs = {}) {
  const s = h('select', attrs);
  for (const o of options) s.append(h('option', { value: o.value, selected: String(o.value) === String(value) ? true : null }, o.label));
  return s;
}
export function badge(text, cls = '') { return h('span', { class: `badge ${cls}` }, text); }
export function fuelBadge(fuel, label) { return h('span', { class: `badge fuel fuel-${fuel}` }, label || fuel); }
export function statCard(iconName, value, label) { return h('div', { class: 'stat' }, h('div', { class: 'ico' }, icon(iconName)), h('div', null, h('b', { class: 'num' }, value), h('span', null, label))); }
export function empty(text, iconName = 'search') { return h('div', { class: 'empty' }, icon(iconName), h('div', null, text)); }
export function progress(pct, cls = '') { return h('div', { class: `progress ${cls}` }, h('i', { style: { width: `${Math.max(0, Math.min(100, pct))}%` } })); }

/**
 * Sortable, paged table. columns: [{key, label, get?, render?, sort?:fn|false, class?}]
 */
export function dataTable({ columns, rows, pageSize = 25, onRowClick, emptyText, initialSort }) {
  let sortKey = initialSort ? initialSort.key : null, sortDir = initialSort ? initialSort.dir : 1, page = 0;
  const wrap = h('div', { class: 'table-wrap' });
  const table = h('table', { class: 'table' });
  const thead = h('thead'); const tbody = h('tbody');
  table.append(thead, tbody); wrap.append(table);
  const pager = h('div', { class: 'pagination' });
  wrap.append(pager);
  const val = (c, r) => (c.get ? c.get(r) : r[c.key]);
  function render() {
    clear(thead); clear(tbody); clear(pager);
    const tr = h('tr');
    for (const c of columns) {
      const th = h('th', { class: c.sort === false ? '' : (sortKey === c.key ? 'sorted' : ''), onClick: () => { if (c.sort === false) return; if (sortKey === c.key) sortDir = -sortDir; else { sortKey = c.key; sortDir = 1; } page = 0; render(); } }, c.label);
      tr.append(th);
    }
    thead.append(tr);
    let data = rows.slice();
    if (sortKey) {
      const c = columns.find(x => x.key === sortKey);
      data.sort((a, b) => { const va = val(c, a), vb = val(c, b); if (va === vb) return 0; if (va === null || va === undefined) return 1; if (vb === null || vb === undefined) return -1; return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), lang())) * sortDir; });
    }
    const total = data.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (page >= pages) page = pages - 1;
    const slice = data.slice(page * pageSize, (page + 1) * pageSize);
    if (!slice.length) tbody.append(h('tr', null, h('td', { colspan: columns.length }, empty(emptyText || t('common.noResults')))));
    for (const r of slice) {
      const row = h('tr', { class: onRowClick ? 'clickable' : '', onClick: onRowClick ? e => { if (e.target.closest('button, a, input, select')) return; onRowClick(r); } : null });
      for (const c of columns) { const v = val(c, r); row.append(h('td', { class: c.class || '' }, c.render ? c.render(v, r) : (v === null || v === undefined ? '—' : String(v)))); }
      tbody.append(row);
    }
    if (total > pageSize) {
      pager.append(h('span', { class: 'muted small' }, t('common.showing', { a: page * pageSize + 1, b: Math.min(total, (page + 1) * pageSize), n: total })),
        h('button', { class: 'btn sm', disabled: page === 0, onClick: () => { page--; render(); } }, t('common.previous')),
        h('span', { class: 'small' }, `${page + 1} / ${pages}`),
        h('button', { class: 'btn sm', disabled: page >= pages - 1, onClick: () => { page++; render(); } }, t('common.next')));
    } else pager.append(h('span', { class: 'muted small' }, `${total} ${t('common.rows')}`));
  }
  render();
  return Object.assign(wrap, { update(newRows) { rows = newRows; page = 0; render(); } });
}

export function tabs(items, initial, onChange) {
  let active = initial || items[0].id;
  const bar = h('div', { class: 'tabs' });
  const panel = h('div');
  function render() {
    clear(bar); clear(panel);
    for (const it of items) bar.append(h('button', { class: it.id === active ? 'active' : '', onClick: () => { active = it.id; render(); onChange && onChange(active); } }, it.label));
    const item = items.find(i => i.id === active);
    const content = item.render();
    if (content) panel.append(content);
  }
  render();
  return h('div', null, bar, panel);
}

export function copyText(text) { return navigator.clipboard.writeText(text).then(() => toast(t('common.copied'), 'success', 1500)); }
export function debounce(fn, ms = 250) { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; }
export function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
