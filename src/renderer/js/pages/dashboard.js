import { t, L, isAr } from '../i18n.js';
import { api } from '../api.js';
import { state, isRole, hasModule, techAllowed } from '../state.js';
import { h, icon, statCard, fmt, fuelBadge, badge, empty } from '../ui.js';
import { barChart, doughnutChart, destroyChart, FUEL_COLORS } from '../lib/charts.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('nav.dashboard'));
  const ds = state.dataset; const user = state.user;
  const operational = ds.plants.filter(p => p.status === 'operational' && !p.excludeFromTotals);
  const totalMw = operational.reduce((a, p) => a + p.capacityMw, 0);
  const renMw = operational.filter(p => ['Solar', 'Wind', 'Hydro', 'Biomass'].includes(p.fuel)).reduce((a, p) => a + p.capacityMw, 0);
  const heroes = ds.plants.filter(p => p.hero && techAllowed(p.technology)).sort((a, b) => b.capacityMw - a.capacityMw).slice(0, 8);
  const charts = [];

  const head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('dash.welcome', { name: user.displayName || user.username })), h('p', null, t('dash.dataNote', { date: (ds.generatedAt || '').slice(0, 10) }))));
  const stats = h('div', { class: 'grid cols-4' },
    statCard('plant', fmt.num(ds.plants.length), t('dash.plants')), statCard('globe', fmt.num(ds.countries.length), t('dash.countries')),
    statCard('bolt', fmt.gw(totalMw), t('dash.capacity')), statCard('sun', `${fmt.pct(renMw / totalMw * 100, 1)} · ${fmt.gw(renMw)}`, t('dash.renewables')));
  const quick = h('div', { class: 'grid cols-3 mt' },
    h('a', { href: '#/plants', class: 'card flex' }, h('div', { class: 'tech-icon', style: { background: 'var(--primary-soft)', color: 'var(--primary)' } }, icon('map')), h('div', null, h('b', null, t('nav.plants')), h('div', { class: 'muted small' }, t('dash.quick.explore')))),
    hasModule('twin') ? h('a', { href: heroes[0] ? `#/twin/${heroes[0].id}` : '#/plants', class: 'card flex' }, h('div', { class: 'tech-icon', style: { background: 'var(--accent-soft)', color: 'var(--accent)' } }, icon('twin')), h('div', null, h('b', null, t('nav.twin')), h('div', { class: 'muted small' }, t('dash.quick.twin')))) : null,
    hasModule('exams') ? h('a', { href: '#/practice', class: 'card flex' }, h('div', { class: 'tech-icon', style: { background: 'var(--success-soft)', color: 'var(--success)' } }, icon('practice')), h('div', null, h('b', null, t('nav.practice')), h('div', { class: 'muted small' }, t('dash.quick.practice')))) : null);

  // exams / results panel
  const side = h('div', { class: 'card' });
  const examsPanel = h('div', { class: 'card' }, h('h3', null, t('dash.myExams')), h('div', { class: 'muted' }, hasModule('exams') ? t('common.loading') : t('license.lockedModule')));
  if (hasModule('exams')) api('exams:list').then(list => {
    examsPanel.replaceChildren(h('h3', null, t('dash.myExams')));
    if (!list.length) examsPanel.append(h('div', { class: 'muted' }, t('dash.noExams')));
    for (const e of list.slice(0, 5)) examsPanel.append(h('div', { class: 'flex between', style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } }, h('div', null, h('b', null, isAr() && e.titleAr ? e.titleAr : e.title || e.titleAr), h('div', { class: 'muted small' }, `${e.questionCount} ${t('exams.questions')} · ${e.durationMinutes} ${t('common.min')}`)), h('a', { href: '#/exams', class: 'btn sm primary' }, t('dash.startExam'))));
  }).catch(() => {});
  if (isRole('instructor')) {
    side.append(h('h3', null, t('dash.classStats')), h('div', { class: 'muted' }, t('common.loading')));
    Promise.all([api('attempts:stats', { kind: 'exam' }), api('users:list')]).then(([st, users]) => {
      side.replaceChildren(h('h3', null, t('dash.classStats')), h('div', { class: 'grid cols-2' },
        statCard('users', fmt.num(users.filter(u => u.role === 'student').length), t('dash.students')), statCard('exam', fmt.num(st.count), t('dash.attempts')),
        statCard('results', fmt.pct(st.mean, 1), t('dash.avg')), statCard('check', fmt.pct(st.passRate, 1), t('dash.passRate'))),
        h('a', { href: '#/admin/results', class: 'btn mt' }, t('nav.resultsAdmin')));
    }).catch(() => {});
  } else {
    side.append(h('h3', null, t('dash.recentResults')), h('div', { class: 'muted' }, t('common.loading')));
    api('attempts:mine').then(list => {
      side.replaceChildren(h('h3', null, t('dash.recentResults')));
      if (!list.length) side.append(h('div', { class: 'muted' }, t('results.none')));
      for (const a of list.slice(0, 5)) side.append(h('a', { href: `#/result/${a.id}`, class: 'flex between', style: { padding: '8px 0', borderBottom: '1px solid var(--border)', color: 'inherit' } }, h('div', null, h('b', null, isAr() && a.examTitleAr ? a.examTitleAr : a.examTitle), h('div', { class: 'muted small' }, fmt.datetime(a.submittedAt))), badge(fmt.pct(a.percent, 1), a.passed ? 'success' : 'danger')));
    }).catch(() => {});
  }

  const heroGrid = h('div', { class: 'grid auto' }, heroes.map(p => h('div', { class: 'card plant-card', onClick: () => navigate(`/twin/${p.id}`) },
    h('div', { class: 'flex between' }, h('span', { class: 'name' }, L(p, 'name')), badge(t('plants.hero'), 'primary')),
    h('div', { class: 'meta' }, h('span', { class: 'country-flag' }, (ds.countries.find(c => c.iso3 === p.country) || {}).flag || ''), L(ds.countries.find(c => c.iso3 === p.country), 'name'), fuelBadge(p.fuel), h('span', { class: 'num' }, fmt.mw(p.capacityMw))),
    h('div', { class: 'muted small' }, L(ds.technologies[p.technology], 'name')),
    h('button', { class: 'btn sm primary', style: { alignSelf: 'flex-start' } }, icon('twin'), t('dash.openTwin')))));

  const c1 = h('canvas'); const c2 = h('canvas');
  const chartsRow = h('div', { class: 'grid cols-2 mt' },
    h('div', { class: 'card', style: { height: '340px' } }, h('h3', null, t('dash.byCountry')), h('div', { style: { height: '270px' } }, c1)),
    h('div', { class: 'card', style: { height: '340px' } }, h('h3', null, t('dash.byFuel')), h('div', { style: { height: '270px' } }, c2)));

  container.append(head, stats, quick, h('div', { class: 'grid cols-2 mt' }, examsPanel, side), h('h2', { class: 'mt-lg' }, t('dash.featured')), heroGrid, chartsRow);

  const countries = ds.countries.slice().sort((a, b) => b.operationalMw - a.operationalMw);
  charts.push(barChart(c1, { labels: countries.map(c => L(c, 'name')), data: countries.map(c => c.operationalMw), label: t('common.mw') }));
  const byFuel = {};
  for (const p of operational) byFuel[p.fuel] = (byFuel[p.fuel] || 0) + p.capacityMw;
  const fuels = Object.entries(byFuel).sort((a, b) => b[1] - a[1]);
  charts.push(doughnutChart(c2, { labels: fuels.map(f => `${f[0]} (${fmt.pct(f[1] / totalMw * 100, 1)})`), data: fuels.map(f => Math.round(f[1])), colors: fuels.map(f => FUEL_COLORS[f[0]]) }));
  return () => charts.forEach(destroyChart);
}
