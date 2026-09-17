import { t, L, LT, lang, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, plantById, techAllowed } from '../state.js';
import { h, icon, toast, field, selectEl } from '../ui.js';
import { navigate } from '../app.js';

const TOPICS = ['general', 'thermal', 'nuclear', 'pv', 'csp', 'wind', 'hydro', 'grid', 'arab', 'economics'];
const TOPIC_LABELS = { general: { ar: 'أساسيات هندسة القدرة', en: 'Fundamentals' }, thermal: { ar: 'المحطات الحرارية', en: 'Thermal plants' }, nuclear: { ar: 'الطاقة النووية', en: 'Nuclear' }, pv: { ar: 'الطاقة الكهروضوئية', en: 'Solar PV' }, csp: { ar: 'الطاقة الشمسية المركزة', en: 'CSP' }, wind: { ar: 'طاقة الرياح', en: 'Wind' }, hydro: { ar: 'الطاقة الكهرومائية', en: 'Hydro' }, grid: { ar: 'الشبكات والتشغيل', en: 'Grid & operations' }, arab: { ar: 'محطات الوطن العربي', en: 'Arab plants' }, economics: { ar: 'الاقتصاد والانبعاثات', en: 'Economics & emissions' } };
export { TOPICS, TOPIC_LABELS };

export async function render(container, params, ctx) {
  ctx.setTitle(t('exams.practiceTitle'));
  const ds = state.dataset;
  const plant = params.plantId ? plantById(params.plantId) : null;
  const sel = { topics: new Set(TOPICS), countries: new Set(plant ? [plant.country] : []), techs: new Set(plant ? [plant.technology] : []) };
  const chips = (items, set, labelFn) => { const wrap = h('div', { class: 'chip-list' }); for (const it of items) { const c = h('span', { class: `chip ${set.has(it) ? 'active' : ''}`, onClick: () => { set.has(it) ? set.delete(it) : set.add(it); c.classList.toggle('active'); } }, labelFn(it)); wrap.append(c); } return wrap; };
  const count = selectEl([5, 10, 15, 20, 30, 40].map(n => ({ value: n, label: String(n) })), plant ? 10 : 15);
  const share = h('input', { type: 'range', min: 0, max: 100, step: 10, value: plant ? 70 : 50 });
  const shareVal = h('span', { class: 'val' }, share.value + '%');
  share.addEventListener('input', () => { shareVal.textContent = share.value + '%'; });
  const countries = ds.countries.slice().sort((a, b) => L(a, 'name').localeCompare(L(b, 'name'), lang()));
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('exams.practiceTitle')), h('p', null, t('exams.practiceIntro')))),
    plant ? h('div', { class: 'alert info' }, `${L(plant, 'name')} – ${L(ds.technologies[plant.technology], 'name')}`) : null,
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' }, h('h3', null, t('exams.topics')), chips(TOPICS, sel.topics, k => LT(TOPIC_LABELS[k])),
        h('div', { class: 'mt' }, field(t('exams.numQuestions'), count)), h('div', { class: 'ctl' }, h('label', { class: 'field' }, h('span', null, t('exams.generatedShare'), ' ', shareVal), share))),
      h('div', { class: 'card' }, h('h3', null, t('exams.scopeCountries')), chips(countries.map(c => c.iso3), sel.countries, iso => { const c = countries.find(x => x.iso3 === iso); return `${c.flag} ${L(c, 'name')}`; }),
        h('h4', { class: 'mt' }, t('admin.exams.techScope')), chips(Object.keys(ds.technologies).filter(techAllowed), sel.techs, k => L(ds.technologies[k], 'name')))),
    h('div', { class: 'mt' }, h('button', { class: 'btn primary lg', onClick: async () => {
      try {
        const a = await api('practice:start', { topics: [...sel.topics], questionCount: Number(count.value), generatedShare: Number(share.value) / 100, plantScope: { countries: [...sel.countries], technologies: [...sel.techs] }, plantId: plant ? plant.id : null });
        navigate(`/exam/${a.id}`);
      } catch (err) { toast(errorMessage(err.code), 'error'); }
    } }, icon('play'), t('exams.startPractice'))));
}
