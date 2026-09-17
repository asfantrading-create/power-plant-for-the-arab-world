import { t, L, LT, isAr } from '../i18n.js';
import { api } from '../api.js';
import { state, plantById, countryByIso, complexById, tech } from '../state.js';
import { h, icon, fmt, fuelBadge, badge, empty, dataTable } from '../ui.js';
import { createMap } from '../lib/map.js';
import { barChart, destroyChart } from '../lib/charts.js';
import { navigate, ensureMap } from '../app.js';

export function haversineKm(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function render(container, params, ctx) {
  const p = plantById(params.id);
  if (!p) { container.append(empty(t('errors.not_found'))); return; }
  const ds = state.dataset; const c = countryByIso(p.country); const tk = tech(p.technology) || {}; const cx = p.complex ? complexById(p.complex) : null;
  ctx.setTitle(L(p, 'name'));
  const charts = [];
  const hasDesc = p.descriptionAr || p.descriptionEn;
  const desc = isAr() ? (p.descriptionAr || p.descriptionEn) : (p.descriptionEn || p.descriptionAr);
  const notes = isAr() ? (p.notesAr || p.notesEn) : (p.notesEn || p.notesAr);
  const cf = tk.typicalCapacityFactor || 0.5;
  const annualGwh = p.capacityMw * 8760 * cf / 1000;

  const head = h('div', { class: 'page-head' },
    h('div', null,
      h('div', { class: 'flex wrap', style: { marginBottom: '6px' } }, h('span', { class: 'country-flag' }, c.flag), h('a', { href: `#/plants?country=${p.country}` }, L(c, 'name')), fuelBadge(p.fuel), badge(L(tk, 'name')), badge(t('status.' + p.status), p.status === 'operational' ? 'success' : 'warning'), badge(t('quality.' + p.dataQuality)), p.hero ? badge('3D', 'primary') : null),
      h('h1', null, L(p, 'name')), isAr() && p.nameAr ? h('p', { class: 'ltr' }, p.name) : (p.nameAr ? h('p', null, p.nameAr) : null)),
    h('div', { class: 'flex wrap' },
      h('button', { class: 'btn primary lg', onClick: () => navigate(`/twin/${p.id}`) }, icon('twin'), t('plant.openTwin')),
      h('button', { class: 'btn', onClick: () => navigate(`/practice?plantId=${p.id}`) }, icon('practice'), t('plant.practice')),
      p.sourceUrl ? h('button', { class: 'btn ghost', onClick: () => api('app:openExternal', { url: p.sourceUrl }) }, icon('globe'), t('plant.sourceLink')) : null));

  const overview = h('div', { class: 'card' }, h('h3', null, t('plant.overview')), h('dl', { class: 'kv' },
    h('dt', null, t('common.capacity')), h('dd', { class: 'num' }, h('b', null, fmt.mw(p.capacityMw, 1))),
    h('dt', null, t('common.technology')), h('dd', null, L(tk, 'name')),
    h('dt', null, t('common.fuel')), h('dd', null, p.fuel),
    h('dt', null, t('plant.commissioned')), h('dd', null, p.commissioningYear || t('common.unknown')),
    p.units ? [h('dt', null, t('plant.units')), h('dd', null, `${p.units} × ${fmt.mw(p.unitCapacityMw)}`)] : null,
    h('dt', null, t('common.owner')), h('dd', null, p.owner || '—'),
    p.operator ? [h('dt', null, 'Operator'), h('dd', null, p.operator)] : null,
    h('dt', null, t('plant.coordinates')), h('dd', { class: 'num' }, `${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}°`),
    cx ? [h('dt', null, t('plant.complex')), h('dd', null, h('a', { href: '#', onClick: e => { e.preventDefault(); document.getElementById('complex-members')?.scrollIntoView({ behavior: 'smooth' }); } }, L(cx, 'name')))] : null,
    h('dt', null, t('common.source')), h('dd', null, p.source || '—'),
    h('dt', null, t('plant.dataQuality')), h('dd', null, t('quality.' + p.dataQuality))));

  const facts = h('div', { class: 'card' }, h('h3', null, t('plant.facts')), h('div', { class: 'facts' },
    (p.facts || []).map(f => h('div', { class: 'fact' }, h('span', null, isAr() ? f.ar : f.en), h('b', null, f.value))),
    h('div', { class: 'fact' }, h('span', null, t('plant.typicalCf')), h('b', null, fmt.pct(cf * 100))),
    tk.efficiency && tk.category === 'thermal' ? h('div', { class: 'fact' }, h('span', null, t('plant.efficiency')), h('b', null, fmt.pct(tk.efficiency * 100))) : null,
    tk.co2KgPerMwh ? h('div', { class: 'fact' }, h('span', null, t('plant.co2')), h('b', null, `${tk.co2KgPerMwh} kg CO₂/MWh`)) : null,
    h('div', { class: 'fact' }, h('span', null, t('plant.estimatedAnnual')), h('b', null, `≈ ${fmt.num(annualGwh)} ${t('common.gwh')}`))));

  const techCard = h('div', { class: 'card' }, h('h3', null, `${t('plant.technology')}: ${L(tk, 'name')}`), h('p', null, isAr() ? tk.descriptionAr : tk.descriptionEn),
    h('div', { class: 'small muted' }, t('plant.components') + ': '), h('div', { class: 'chip-list' }, (isAr() ? tk.componentsAr : tk.components || []).map(x => h('span', { class: 'chip' }, x))));
  const descCard = (hasDesc || notes) ? h('div', { class: 'card' }, hasDesc ? [h('h3', null, t('common.details')), h('p', null, desc)] : null, notes ? [h('h4', null, t('plant.notes')), h('p', { class: 'muted' }, notes)] : null) : null;

  let genCard = null;
  const gen = p.generationGwh || p.estimatedGenerationGwh;
  if (gen) {
    const cv = h('canvas');
    genCard = h('div', { class: 'card', style: { height: '260px' } }, h('h3', null, p.generationGwh ? t('plant.generation') : t('plant.estimated')), h('div', { style: { height: '190px' } }, cv));
    setTimeout(() => charts.push(barChart(cv, { labels: Object.keys(gen), data: Object.values(gen).map(v => Math.round(v)), label: t('common.gwh') })), 0);
  }

  const nearby = ds.plants.filter(x => x.id !== p.id).map(x => ({ p: x, d: haversineKm(p, x) })).sort((a, b) => a.d - b.d).slice(0, 8);
  const mapWrap = h('div', { class: 'map-wrap', style: { height: '300px' } });
  const nearCard = h('div', { class: 'card' }, h('h3', null, t('plant.location')), mapWrap, h('h4', { class: 'mt' }, t('plant.nearby')),
    h('div', null, nearby.map(n => h('div', { class: 'flex between', style: { padding: '4px 0', borderBottom: '1px solid var(--border)' } }, h('a', { href: `#/plant/${n.p.id}` }, L(n.p, 'name')), h('span', { class: 'muted small num' }, `${fmt.num(n.d)} ${t('plant.km')} · ${fmt.mw(n.p.capacityMw)}`)))));
  ensureMap().then(m => { const mp = createMap(mapWrap, { map: m, plants: [p, ...nearby.map(n => n.p)], onSelect: x => navigate(`/plant/${x.id}`) }); mp.focus(p.lon, p.lat, 8); });

  let membersCard = null;
  if (cx) {
    const members = cx.memberIds.map(plantById).filter(Boolean);
    membersCard = h('div', { class: 'card', id: 'complex-members' }, h('h3', null, `${t('plant.members')}: ${L(cx, 'name')} (${fmt.mw(cx.totalMw)})`),
      dataTable({ rows: members, onRowClick: x => navigate(`/plant/${x.id}`), pageSize: 50, columns: [
        { key: 'name', label: t('common.name'), get: x => L(x, 'name') }, { key: 'technology', label: t('common.technology'), get: x => L(ds.technologies[x.technology], 'name') },
        { key: 'capacityMw', label: t('common.capacity'), render: v => fmt.mw(v) }, { key: 'commissioningYear', label: t('common.year') }, { key: 'status', label: t('common.status'), render: v => t('status.' + v) }] }));
  }

  container.append(head, h('div', { class: 'grid cols-2' }, overview, facts), h('div', { class: 'grid cols-2 mt' }, techCard, h('div', { class: 'flex col', style: { gap: '16px' } }, descCard, genCard)), h('div', { class: 'mt' }, nearCard), membersCard ? h('div', { class: 'mt' }, membersCard) : null);
  return () => charts.forEach(destroyChart);
}
