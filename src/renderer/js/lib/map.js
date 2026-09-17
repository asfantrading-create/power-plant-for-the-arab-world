// Offline SVG map of the Arab world (Natural Earth outlines) with plant markers, pan/zoom, hover and click.
import { h, clear } from '../ui.js';
import { L, t } from '../i18n.js';
import { FUEL_COLORS } from './charts.js';

const BBOX = { minLon: -20, maxLon: 62, minLat: -14, maxLat: 40 };
const W = 1000, H = Math.round(W * (BBOX.maxLat - BBOX.minLat) / (BBOX.maxLon - BBOX.minLon));
const K = W / (BBOX.maxLon - BBOX.minLon);
export const project = (lon, lat) => [(lon - BBOX.minLon) * K, (BBOX.maxLat - lat) * K];
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); return e; };

export function createMap(container, { map, plants, onSelect, onCountry, highlightCountry }) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
  const g = el('g');
  const countriesG = el('g', { class: 'countries' });
  const pointsG = el('g', { class: 'points' });
  g.append(countriesG, pointsG); svg.append(g);
  const tooltip = h('div', { class: 'map-tooltip hidden' });
  const controls = h('div', { class: 'map-controls' });
  const legend = h('div', { class: 'map-legend' });
  clear(container); container.append(svg, tooltip, controls, legend);
  let scale = 1, tx = 0, ty = 0, selectedCountry = highlightCountry || null;
  function applyTransform() { g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`); for (const c of pointsG.children) { const r = Number(c.dataset.r); c.setAttribute('r', r / Math.sqrt(scale)); c.setAttribute('stroke-width', 1 / scale); } }
  function fill(iso, arab) { if (!arab) return 'var(--map-context, #14232f)'; if (selectedCountry && iso === selectedCountry) return 'var(--map-land-selected, #1f6f7a)'; return 'var(--map-land, #1b3a4b)'; }
  function drawCountries() {
    clear(countriesG);
    for (const f of map.features) {
      const d = f.geometry.coordinates.map(poly => poly.map(ring => 'M' + ring.map(([x, y]) => project(x, y).map(v => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
      const p = el('path', { d, fill: fill(f.properties.iso, f.properties.arab), stroke: f.properties.arab ? 'var(--map-stroke, #3b6f8a)' : 'var(--map-context-stroke, #1f3040)', 'stroke-width': .6 });
      p.dataset.iso = f.properties.iso;
      if (f.properties.arab) { p.style.cursor = 'pointer'; p.addEventListener('click', () => { if (onCountry) onCountry(f.properties.iso); }); }
      countriesG.append(p);
    }
  }
  function drawPoints(list) {
    clear(pointsG);
    const sorted = list.slice().sort((a, b) => b.capacityMw - a.capacityMw);
    for (const p of sorted) {
      const [x, y] = project(p.lon, p.lat);
      const r = Math.max(2.2, Math.min(14, Math.sqrt(p.capacityMw) / 5));
      const c = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: FUEL_COLORS[p.fuel] || '#fff', 'fill-opacity': p.status === 'operational' ? .85 : .45, stroke: p.status === 'operational' ? 'var(--map-point-stroke, #04121a)' : '#fff', 'stroke-width': 1, 'stroke-dasharray': p.status === 'operational' ? '' : '1.5,1' });
      c.dataset.r = r; c.dataset.id = p.id; c.style.cursor = 'pointer';
      c.addEventListener('mouseenter', e => showTip(e, p)); c.addEventListener('mousemove', e => moveTip(e)); c.addEventListener('mouseleave', hideTip);
      c.addEventListener('click', e => { e.stopPropagation(); if (onSelect) onSelect(p); });
      pointsG.append(c);
    }
    applyTransform();
  }
  function showTip(e, p) { tooltip.classList.remove('hidden'); tooltip.innerHTML = ''; tooltip.append(h('b', null, L(p, 'name')), h('br'), `${p.capacityMw.toLocaleString('en-US')} ${t('common.mw')} · ${p.fuel}${p.commissioningYear ? ' · ' + p.commissioningYear : ''}`); moveTip(e); }
  function moveTip(e) { const r = container.getBoundingClientRect(); let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14; if (x + 260 > r.width) x -= 280; if (y + 80 > r.height) y -= 90; tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'; }
  function hideTip() { tooltip.classList.add('hidden'); }
  // pan / zoom
  let dragging = false, last = null, moved = false;
  const pt = e => { const r = svg.getBoundingClientRect(); const sx = W / r.width, sy = H / r.height; return [(e.clientX - r.left) * Math.max(sx, sy) - (Math.max(sx, sy) * r.width - W) / 2, (e.clientY - r.top) * Math.max(sx, sy) - (Math.max(sx, sy) * r.height - H) / 2]; };
  svg.addEventListener('mousedown', e => { dragging = true; moved = false; last = [e.clientX, e.clientY]; });
  const onMove = e => { if (!dragging) return; const r = svg.getBoundingClientRect(); const unitsPerPx = Math.max(W / r.width, H / r.height); tx += (e.clientX - last[0]) * unitsPerPx; ty += (e.clientY - last[1]) * unitsPerPx; last = [e.clientX, e.clientY]; moved = true; applyTransform(); };
  const onUp = () => { dragging = false; };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  svg.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = pt(e); const f = e.deltaY < 0 ? 1.2 : 1 / 1.2; const ns = Math.max(.7, Math.min(20, scale * f)); const k = ns / scale; tx = mx - (mx - tx) * k; ty = my - (my - ty) * k; scale = ns; applyTransform(); }, { passive: false });
  function zoomBy(f) { const cx = W / 2, cy = H / 2; const ns = Math.max(.7, Math.min(20, scale * f)); const k = ns / scale; tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; scale = ns; applyTransform(); }
  function reset() { scale = 1; tx = 0; ty = 0; applyTransform(); }
  function focus(lon, lat, s = 6) { const [x, y] = project(lon, lat); scale = s; tx = W / 2 - x * s; ty = H / 2 - y * s; applyTransform(); }
  function focusCountry(iso) {
    selectedCountry = iso; drawCountries();
    const f = map.features.find(x => x.properties.iso === iso);
    if (!f) { reset(); return; }
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const poly of f.geometry.coordinates) for (const [lon, lat] of poly[0]) { const [x, y] = project(lon, lat); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const s = Math.max(1, Math.min(12, 0.8 * Math.min(W / (maxX - minX + 1), H / (maxY - minY + 1))));
    scale = s; tx = W / 2 - (minX + maxX) / 2 * s; ty = H / 2 - (minY + maxY) / 2 * s; applyTransform();
  }
  controls.append(h('button', { class: 'btn sm', onClick: () => zoomBy(1.4) }, '+'), h('button', { class: 'btn sm', onClick: () => zoomBy(1 / 1.4) }, '−'), h('button', { class: 'btn sm', onClick: reset }, '⟲'));
  for (const [fuel, color] of Object.entries(FUEL_COLORS)) legend.append(h('span', null, h('i', { style: { background: color } }), fuel));
  drawCountries(); drawPoints(plants || []);
  return { setPlants: drawPoints, focus, focusCountry, reset, svg, selectCountry(iso) { selectedCountry = iso; drawCountries(); }, destroy() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); } };
}
