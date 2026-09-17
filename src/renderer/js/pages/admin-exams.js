import { t, L, LT, isAr, lang, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { h, icon, toast, modal, confirmDialog, field, selectEl, dataTable, badge, fmt } from '../ui.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.exams.title'));
  const ds = state.dataset;
  const [groups, bank] = await Promise.all([api('groups:list'), api('data:questionBankInfo')]);
  state.cache.topics = bank.topics;
  const box = h('div');
  async function load() {
    const [exams, stats] = await Promise.all([api('exams:all'), api('attempts:stats', { kind: 'exam' })]);
    box.replaceChildren(dataTable({ rows: exams, columns: [
      { key: 'title', label: t('common.name'), get: e => isAr() && e.titleAr ? e.titleAr : (e.title || e.titleAr), render: (v, e) => h('span', null, h('b', null, v), h('div', { class: 'muted small' }, (e.topics || []).map(k => bank.topics[k] ? LT(bank.topics[k]) : k).join('، '))) },
      { key: 'questionCount', label: t('exams.questions') }, { key: 'durationMinutes', label: t('admin.exams.duration') }, { key: 'passMark', label: t('exams.passMark'), render: v => v + '%' },
      { key: 'groups', label: t('admin.exams.groups'), get: e => (e.assignedGroups || []).map(id => (groups.find(g => g.id === id) || {}).name).filter(Boolean).join(', ') || t('common.all') },
      { key: 'attempts', label: t('admin.exams.attemptsCount'), get: e => (stats.byExam[e.id] || {}).count || 0, render: (v, e) => { const s = stats.byExam[e.id]; return h('span', null, String(v), s ? h('span', { class: 'muted small' }, ` · ${t('admin.exams.avg')} ${fmt.pct(s.mean, 1)}`) : null); } },
      { key: 'active', label: t('common.status'), render: v => badge(v === false ? t('admin.users.inactive') : t('admin.exams.active'), v === false ? 'warning' : 'success') },
      { key: 'actions', label: t('common.actions'), sort: false, render: (_, e) => h('div', { class: 'flex' }, h('button', { class: 'btn sm', onClick: () => navigate(`/admin/results?examId=${e.id}`) }, icon('results')), h('button', { class: 'btn sm', onClick: () => edit(e) }, icon('settings')), h('button', { class: 'btn sm danger', onClick: async () => { if (await confirmDialog(t('common.confirmDelete'), { danger: true })) { await api('exams:remove', { id: e.id }); load(); } } }, icon('x'))) },
    ] }));
  }
  function chipSet(items, initial, labelFn) { const set = new Set(initial); const wrap = h('div', { class: 'chip-list' }); for (const it of items) { const c = h('span', { class: `chip ${set.has(it) ? 'active' : ''}`, onClick: () => { set.has(it) ? set.delete(it) : set.add(it); c.classList.toggle('active'); onChange(); } }, labelFn(it)); wrap.append(c); } let onChange = () => {}; return { wrap, set, onChange: fn => { onChange = fn; } }; }
  function edit(e) {
    const f = {
      title: h('input', { type: 'text', value: e ? e.title : '' }), titleAr: h('input', { type: 'text', value: e ? e.titleAr : '' }), description: h('textarea', null, e ? e.description : ''),
      questionCount: h('input', { type: 'number', min: 1, max: 200, value: e ? e.questionCount : 20 }), generatedShare: h('input', { type: 'range', min: 0, max: 100, step: 10, value: e ? Math.round(e.generatedShare * 100) : 40 }),
      durationMinutes: h('input', { type: 'number', min: 1, max: 600, value: e ? e.durationMinutes : 30 }), passMark: h('input', { type: 'number', min: 0, max: 100, value: e ? e.passMark : 60 }), maxAttempts: h('input', { type: 'number', min: 0, max: 50, value: e ? e.maxAttempts : 2 }),
      showAnswers: h('input', { type: 'checkbox', checked: e ? e.showAnswers !== false : true }), shuffle: h('input', { type: 'checkbox', checked: e ? e.shuffle !== false : true }), active: h('input', { type: 'checkbox', checked: e ? e.active !== false : true }),
    };
    const topics = chipSet(Object.keys(bank.topics), e ? e.topics : Object.keys(bank.topics), k => `${LT(bank.topics[k])} (${bank.counts[k] || 0})`);
    const countries = ds.countries.slice().sort((a, b) => L(a, 'name').localeCompare(L(b, 'name'), lang()));
    const cset = chipSet(countries.map(c => c.iso3), e ? e.plantScope?.countries || [] : [], iso => { const c = countries.find(x => x.iso3 === iso); return `${c.flag} ${L(c, 'name')}`; });
    const tset = chipSet(Object.keys(ds.technologies), e ? e.plantScope?.technologies || [] : [], k => L(ds.technologies[k], 'name'));
    const gset = chipSet(groups.map(g => g.id), e ? e.assignedGroups || [] : [], id => groups.find(g => g.id === id).name);
    const shareVal = h('span', { class: 'val' }, f.generatedShare.value + '%'); f.generatedShare.addEventListener('input', () => { shareVal.textContent = f.generatedShare.value + '%'; });
    const avail = h('div', { class: 'help' }); const updAvail = () => { avail.textContent = t('admin.exams.bankAvailable', { n: [...topics.set].reduce((a, k) => a + (bank.counts[k] || 0), 0) }); }; topics.onChange(updAvail); updAvail();
    const body = h('div', { class: 'grid cols-2' },
      h('div', null, field(t('admin.exams.titleAr'), f.titleAr), field(t('admin.exams.titleEn'), f.title), field(t('admin.exams.description'), f.description), field(t('admin.exams.questionCount'), f.questionCount), h('div', { class: 'ctl' }, h('label', { class: 'field' }, h('span', null, t('admin.exams.generatedShare'), ' ', shareVal), f.generatedShare)), field(t('admin.exams.duration'), f.durationMinutes), field(t('admin.exams.passMark'), f.passMark), field(t('admin.exams.maxAttempts'), f.maxAttempts),
        h('label', { class: 'check' }, f.showAnswers, t('admin.exams.showAnswers')), h('label', { class: 'check mt' }, f.shuffle, t('admin.exams.shuffle')), h('label', { class: 'check mt' }, f.active, t('admin.exams.active'))),
      h('div', null, h('h4', null, t('admin.exams.topics')), topics.wrap, avail, h('h4', { class: 'mt' }, t('admin.exams.scope')), cset.wrap, h('h4', { class: 'mt' }, t('admin.exams.techScope')), tset.wrap, h('h4', { class: 'mt' }, t('admin.exams.groups')), groups.length ? gset.wrap : h('div', { class: 'muted small' }, t('common.none'))));
    modal({ title: e ? t('common.edit') : t('admin.exams.add'), wide: true, body, actions: [{ label: t('common.cancel'), class: 'ghost' }, { label: t('common.save'), class: 'primary', onClick: async () => {
      const payload = { title: f.title.value, titleAr: f.titleAr.value, description: f.description.value, topics: [...topics.set], questionCount: Number(f.questionCount.value), generatedShare: Number(f.generatedShare.value) / 100, plantScope: { countries: [...cset.set], technologies: [...tset.set] }, durationMinutes: Number(f.durationMinutes.value), passMark: Number(f.passMark.value), maxAttempts: Number(f.maxAttempts.value), assignedGroups: [...gset.set], showAnswers: f.showAnswers.checked, shuffle: f.shuffle.checked, active: f.active.checked };
      try { if (e) await api('exams:update', { id: e.id, patch: payload }); else await api('exams:create', payload); toast(e ? t('common.saved') : t('admin.exams.created'), 'success'); load(); } catch (err) { toast(errorMessage(err.code), 'error'); return false; }
    } }] });
  }
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.exams.title')), h('p', null, `${bank.total} ${t('exams.questions')} · ${Object.keys(bank.topics).length} ${t('exams.topics')}`)), h('button', { class: 'btn primary', onClick: () => edit(null) }, icon('plus'), t('admin.exams.add'))), box);
  await load();
}
