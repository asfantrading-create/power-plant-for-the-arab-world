import { t, L, lang } from '../i18n.js';
import { state, countryByIso } from '../state.js';
import { h, clear, icon, fmt, fuelBadge, badge, dataTable, selectEl, debounce } from '../ui.js';
import { createMap } from '../lib/map.js';
import { navigate, ensureMap } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('plants.title'));
  const ds = state.dataset;
  const filters = { q: params.q || '', country: params.country || '', fuel: params.fuel || '', tech: params.tech || '', status: params.status || '', minMw: Number(params.min || 0), sort: 'capacity', view: 'table' };
  const countries = ds.countries.slice().sort((a, b) => L(a, 'name').localeCompare(L(b, 'name'), lang()));
  const fuels = [...new Set(ds.plants.map(p => p.fuel))].sort();
  const techs = Object.keys(ds.technologies);

  const search = h('input', { type: 'search', class: 'search', placeholder: t('common.search'), value: filters.q });
  const selCountry = selectEl([{ value: '', label: t('common.all') + ' – ' + t('plants.filterCountry') }, ...countries.map(c => ({ value: c.iso3, label: `${c.flag} ${L(c, 'name')} (${c.plantCount})` }))], filters.country);
  const selFuel = selectEl([{ value: '', label: t('common.all') + ' – ' + t('plants.filterFuel') }, ...fuels.map(f => ({ value: f, label: f }))], filters.fuel);
  const selTech = selectEl([{ value: '', label: t('common.all') + ' – ' + t('plants.filterTech') }, ...techs.map(k => ({ value: k, label: L(ds.technologies[k], 'name') }))], filters.tech);
  const selStatus = selectEl([{ value: '', label: t('common.all') + ' – ' + t('plants.filterStatus') }, ...['operational', 'under_construction', 'planned'].map(s => ({ value: s, label: t('status.' + s) }))], filters.status);
  const minMw = h('input', { type: 'number', min: 0, step: 50, placeholder: t('plants.minCapacity'), value: filters.minMw || '', style: { width: '130px' } });
  const selSort = selectEl([{ value: 'capacity', label: t('plants.sortCapacity') }, { value: 'name', label: t('plants.sortName') }, { value: 'year', label: t('plants.sortYear') }], filters.sort);
  const viewBtns = h('div', { class: 'btn-group' }, h('button', { class: 'btn sm active', onClick: () => setView('table') }, t('plants.view.list')), h('button', { class: 'btn sm', onClick: () => setView('cards') }, t('plants.view.cards')));
  const summary = h('div', { class: 'muted small', style: { padding: '0 4px 8px' } });
  const listEl = h('div', { class: 'list' });
  const mapWrap = h('div', { class: 'map-wrap' });
  const head = h('div', { style: { padding: '18px 24px 0' } },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('plants.title')), h('p', null, t('plants.subtitle', { n: ds.plants.length, c: ds.countries.length })))),
    h('div', { class: 'toolbar' }, search, selCountry, selFuel, selTech, selStatus, minMw, selSort, viewBtns));
  container.append(head, h('div', { class: 'explorer', style: { padding: '0 24px 16px' } }, h('div', { class: 'list' }, summary, listEl), mapWrap));

  let map = null;
  ensureMap().then(m => {
    map = createMap(mapWrap, { map: m, plants: current(), onSelect: p => navigate(`/plant/${p.id}`), onCountry: iso => { selCountry.value = selCountry.value === iso ? '' : iso; apply(); }, highlightCountry: filters.country || null });
    if (filters.country) map.focusCountry(filters.country);
  });

  function current() {
    const q = filters.q.trim().toLowerCase();
    let list = ds.plants.filter(p => (!filters.country || p.country === filters.country) && (!filters.fuel || p.fuel === filters.fuel) && (!filters.tech || p.technology === filters.tech) && (!filters.status || p.status === filters.status) && p.capacityMw >= (filters.minMw || 0)
      && (!q || p.name.toLowerCase().includes(q) || (p.nameAr || '').includes(filters.q.trim()) || (p.owner || '').toLowerCase().includes(q)));
    if (filters.sort === 'capacity') list.sort((a, b) => b.capacityMw - a.capacityMw);
    else if (filters.sort === 'name') list.sort((a, b) => L(a, 'name').localeCompare(L(b, 'name'), lang()));
    else list.sort((a, b) => (b.commissioningYear || 0) - (a.commissioningYear || 0));
    return list;
  }
  function setView(v) { filters.view = v; [...viewBtns.children].forEach((b, i) => b.classList.toggle('active', (i === 0) === (v === 'table'))); draw(); }
  function draw() {
    const list = current();
    const mw = list.filter(p => p.status === 'operational' && !p.excludeFromTotals).reduce((a, p) => a + p.capacityMw, 0);
    summary.textContent = t('plants.matching', { n: list.length, mw: fmt.num(mw) }) + ' · ' + t('plants.mapHint');
    clear(listEl);
    if (filters.view === 'cards') {
      listEl.append(h('div', { class: 'grid auto' }, list.slice(0, 200).map(p => { const c = countryByIso(p.country); return h('div', { class: 'card plant-card pad-sm', onClick: () => navigate(`/plant/${p.id}`) },
        h('div', { class: 'name' }, L(p, 'name')), h('div', { class: 'meta' }, h('span', { class: 'country-flag' }, c.flag), L(c, 'name'), fuelBadge(p.fuel), p.hero ? badge('3D', 'primary') : null),
        h('div', { class: 'flex between' }, h('b', { class: 'num' }, fmt.mw(p.capacityMw)), h('span', { class: 'muted small' }, L(ds.technologies[p.technology], 'name')))); })));
    } else {
      listEl.append(dataTable({ pageSize: 30, rows: list, onRowClick: p => navigate(`/plant/${p.id}`), columns: [
        { key: 'name', label: t('common.name'), get: p => L(p, 'name'), render: (v, p) => h('span', null, h('b', null, v), p.hero ? [' ', badge('3D', 'primary')] : null) },
        { key: 'country', label: t('common.country'), get: p => L(countryByIso(p.country), 'name'), render: (v, p) => `${countryByIso(p.country).flag} ${v}` },
        { key: 'fuel', label: t('common.fuel'), render: v => fuelBadge(v) },
        { key: 'technology', label: t('common.technology'), get: p => L(ds.technologies[p.technology], 'name') },
        { key: 'capacityMw', label: t('common.capacity'), render: v => h('span', { class: 'num' }, fmt.mw(v)), class: 'num' },
        { key: 'commissioningYear', label: t('common.year') },
        { key: 'status', label: t('common.status'), render: v => badge(t('status.' + v), v === 'operational' ? 'success' : 'warning') },
      ] }));
    }
    if (map) map.setPlants(list);
  }
  function apply() {
    filters.q = search.value; filters.country = selCountry.value; filters.fuel = selFuel.value; filters.tech = selTech.value; filters.status = selStatus.value; filters.minMw = Number(minMw.value) || 0; filters.sort = selSort.value;
    if (map) { map.selectCountry(filters.country || null); if (filters.country) map.focusCountry(filters.country); }
    draw();
  }
  search.addEventListener('input', debounce(apply, 200));
  for (const s of [selCountry, selFuel, selTech, selStatus, selSort]) s.addEventListener('change', apply);
  minMw.addEventListener('input', debounce(apply, 300));
  draw();
}
