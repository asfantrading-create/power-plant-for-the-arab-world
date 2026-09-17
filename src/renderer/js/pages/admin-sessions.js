import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { h, icon, toast, dataTable, fmt, selectEl, modal } from '../ui.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.sessions.title'));
  const [rows, users] = await Promise.all([api('twin:sessions'), api('users:list')]);
  const selUser = selectEl([{ value: '', label: t('common.all') + ' – ' + t('admin.results.filterStudent') }, ...users.map(u => ({ value: u.id, label: `${u.displayName} (${u.username})` }))], params.userId || '');
  const box = h('div');
  function draw() {
    const list = rows.filter(r => !selUser.value || r.userId === selUser.value);
    box.replaceChildren(dataTable({ rows: list, pageSize: 25, initialSort: { key: 'startedAt', dir: -1 }, onRowClick: s => modal({ title: s.plantName, body: h('div', null, h('dl', { class: 'kv' }, h('dt', null, t('admin.results.student')), h('dd', null, `${s.displayName} (${s.username})`), h('dt', null, t('common.date')), h('dd', null, fmt.datetime(s.startedAt)), h('dt', null, t('admin.sessions.duration')), h('dd', null, fmt.duration(s.durationSec)), h('dt', null, t('twin.simTime')), h('dd', null, `${fmt.num(s.kpis.simHours, 1)} ${t('common.hours')}`), h('dt', null, t('admin.sessions.energy')), h('dd', null, `${fmt.num(s.kpis.energyMwh, 1)} MWh`), h('dt', null, t('admin.sessions.cf')), h('dd', null, fmt.pct(s.kpis.capacityFactor * 100, 1)), h('dt', null, t('twin.availability')), h('dd', null, fmt.pct(s.kpis.availability * 100, 1)), h('dt', null, t('admin.sessions.trips')), h('dd', null, String(s.kpis.trips))), h('h4', { class: 'mt' }, t('twin.alarms')), h('div', { class: 'alarm-list' }, (s.events || []).slice().reverse().map(e => h('div', { class: `alarm ${e.level === 'trip' ? 'trip' : e.level === 'info' ? 'info' : ''}` }, e.text)))), actions: [{ label: t('common.close'), class: 'ghost' }] }), columns: [
      { key: 'displayName', label: t('admin.results.student'), render: (v, r) => h('span', null, h('b', null, v), h('div', { class: 'muted small' }, r.username)) }, { key: 'plantName', label: t('admin.sessions.plant') }, { key: 'startedAt', label: t('common.date'), render: v => fmt.datetime(v) },
      { key: 'durationSec', label: t('admin.sessions.duration'), render: v => fmt.duration(v) }, { key: 'energy', label: t('admin.sessions.energy'), get: r => r.kpis?.energyMwh, render: v => `${fmt.num(v, 1)} MWh` }, { key: 'cf', label: t('admin.sessions.cf'), get: r => r.kpis?.capacityFactor, render: v => fmt.pct((v || 0) * 100, 1) }, { key: 'trips', label: t('admin.sessions.trips'), get: r => r.kpis?.trips },
    ] }));
  }
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.sessions.title')), h('p', null, t('admin.sessions.intro'))), h('button', { class: 'btn', onClick: async () => { try { const r = await api('export:csv', { rows: rows.map(s => ({ ...s, ...s.kpis })), columns: [{ key: 'displayName', label: t('admin.results.student') }, { key: 'username', label: t('admin.users.username') }, { key: 'plantName', label: t('admin.sessions.plant') }, { key: 'startedAt', label: t('common.date') }, { key: 'durationSec', label: t('admin.sessions.duration') }, { key: 'simHours', label: t('twin.simTime') }, { key: 'energyMwh', label: 'MWh' }, { key: 'capacityFactor', label: t('admin.sessions.cf') }, { key: 'availability', label: t('twin.availability') }, { key: 'trips', label: t('admin.sessions.trips') }, { key: 'co2Tonnes', label: 'CO2 t' }], suggestedName: 'twin-sessions.csv' }); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); } catch (err) { toast(errorMessage(err.code), 'error'); } } }, icon('download'), t('common.exportCsv'))),
    h('div', { class: 'toolbar' }, selUser), box);
  selUser.addEventListener('change', draw); draw();
}
