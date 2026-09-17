'use strict';
/**
 * Generates exam questions from the real plant dataset (capacity, country, technology, year, comparisons,
 * and engineering calculations such as annual energy, heat input and CO2). Deterministic given a seeded RNG.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });

const FUEL_AR = { Gas: 'الغاز الطبيعي', Oil: 'الوقود السائل (نفط/مازوت)', Solar: 'الطاقة الشمسية', Wind: 'طاقة الرياح', Hydro: 'الطاقة الكهرومائية', Coal: 'الفحم', Nuclear: 'الطاقة النووية', Biomass: 'الكتلة الحيوية', Waste: 'النفايات' };
const FUEL_EN = { Gas: 'Natural gas', Oil: 'Oil / fuel oil', Solar: 'Solar', Wind: 'Wind', Hydro: 'Hydropower', Coal: 'Coal', Nuclear: 'Nuclear', Biomass: 'Biomass', Waste: 'Waste' };

function plantLabel(p, lang) { return lang === 'ar' && p.nameAr ? p.nameAr : p.name; }

function distractorsAround(rng, value, count = 3) {
  const out = new Set();
  const factors = [0.5, 0.65, 0.8, 1.25, 1.5, 2, 2.5, 3];
  let guard = 0;
  while (out.size < count && guard++ < 50) {
    const f = pick(rng, factors);
    let v = value * f;
    v = value >= 100 ? Math.round(v / 10) * 10 : Math.round(v * 10) / 10;
    if (v !== value && v > 0) out.add(v);
  }
  return [...out];
}

function makeOptions(rng, correct, distractors, render) {
  const opts = shuffle(rng, [correct, ...distractors]);
  return { options: opts.map(render), correct: opts.indexOf(correct) };
}

/**
 * @param {object} ds dataset {plants, countries, technologies}
 * @param {{count:number, countries?:string[], technologies?:string[], seed?:string}} cfg
 */
function generate(ds, cfg) {
  const rng = mulberry32(seedFrom(cfg.seed || Date.now()));
  const countryByIso = Object.fromEntries(ds.countries.map(c => [c.iso3, c]));
  let pool = ds.plants.filter(p => p.status === 'operational' && !p.excludeFromTotals);
  if (cfg.countries?.length) pool = pool.filter(p => cfg.countries.includes(p.country));
  if (cfg.technologies?.length) pool = pool.filter(p => cfg.technologies.includes(p.technology));
  if (pool.length < 4) pool = ds.plants.filter(p => p.status === 'operational' && !p.excludeFromTotals);
  const big = pool.filter(p => p.capacityMw >= 100);
  const basePool = big.length >= 8 ? big : pool;
  const questions = [];
  const used = new Set();
  const kinds = ['capacity', 'country', 'fuel', 'largest', 'year', 'energy', 'heat', 'co2', 'technology', 'countryTotal'];
  let guard = 0;
  while (questions.length < cfg.count && guard++ < cfg.count * 20) {
    const kind = kinds[questions.length % kinds.length];
    const p = pick(rng, basePool);
    const key = kind + ':' + p.id;
    if (used.has(key)) continue;
    const tech = ds.technologies[p.technology] || {};
    const country = countryByIso[p.country];
    let q = null;
    switch (kind) {
      case 'capacity': {
        const { options, correct } = makeOptions(rng, p.capacityMw, distractorsAround(rng, p.capacityMw), v => ({ ar: `${fmt(v)} ميغاواط`, en: `${fmt(v)} MW` }));
        q = { prompt: { ar: `ما القدرة الاسمية لمحطة «${plantLabel(p, 'ar')}» في ${country.nameAr}؟`, en: `What is the nameplate capacity of "${plantLabel(p, 'en')}" in ${country.nameEn}?` }, options, correct,
          explanation: { ar: `القدرة المسجلة في قاعدة البيانات: ${fmt(p.capacityMw)} ميغاواط (المصدر: ${p.source}).`, en: `Recorded capacity: ${fmt(p.capacityMw)} MW (source: ${p.source}).` } };
        break;
      }
      case 'country': {
        const others = shuffle(rng, ds.countries.filter(c => c.iso3 !== p.country)).slice(0, 3).map(c => c.iso3);
        const { options, correct } = makeOptions(rng, p.country, others, iso => ({ ar: countryByIso[iso].nameAr, en: countryByIso[iso].nameEn }));
        q = { prompt: { ar: `في أي دولة تقع محطة «${plantLabel(p, 'ar')}» (${fmt(p.capacityMw)} ميغاواط)؟`, en: `In which country is "${plantLabel(p, 'en')}" (${fmt(p.capacityMw)} MW) located?` }, options, correct,
          explanation: { ar: `تقع المحطة في ${country.nameAr} عند الإحداثيات ${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°.`, en: `The plant is in ${country.nameEn} at ${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°.` } };
        break;
      }
      case 'fuel': {
        const fuels = Object.keys(FUEL_EN).filter(f => f !== p.fuel);
        const { options, correct } = makeOptions(rng, p.fuel, shuffle(rng, fuels).slice(0, 3), f => ({ ar: FUEL_AR[f], en: FUEL_EN[f] }));
        q = { prompt: { ar: `ما مصدر الطاقة الأساسي لمحطة «${plantLabel(p, 'ar')}»؟`, en: `What is the primary energy source of "${plantLabel(p, 'en')}"?` }, options, correct,
          explanation: { ar: `المحطة من نوع ${tech.nameAr || p.technology} وتعمل بـ${FUEL_AR[p.fuel]}.`, en: `The plant is a ${tech.nameEn || p.technology} running on ${FUEL_EN[p.fuel].toLowerCase()}.` } };
        break;
      }
      case 'technology': {
        const techs = Object.keys(ds.technologies).filter(t => t !== p.technology);
        const { options, correct } = makeOptions(rng, p.technology, shuffle(rng, techs).slice(0, 3), t => ({ ar: ds.technologies[t].nameAr, en: ds.technologies[t].nameEn }));
        q = { prompt: { ar: `ما تقنية التوليد المستخدمة في محطة «${plantLabel(p, 'ar')}» (${country.nameAr})؟`, en: `Which generation technology does "${plantLabel(p, 'en')}" (${country.nameEn}) use?` }, options, correct,
          explanation: { ar: tech.descriptionAr ? tech.descriptionAr.split('.')[0] + '.' : '', en: tech.descriptionEn ? tech.descriptionEn.split('.')[0] + '.' : '' } };
        break;
      }
      case 'largest': {
        const same = shuffle(rng, basePool.filter(x => x.country === p.country && x.id !== p.id)).slice(0, 3);
        if (same.length < 3) continue;
        const cands = [p, ...same];
        const largest = cands.reduce((a, b) => (b.capacityMw > a.capacityMw ? b : a));
        if (cands.filter(c => c.capacityMw === largest.capacityMw).length > 1) continue;
        const opts = shuffle(rng, cands);
        q = { prompt: { ar: `أي المحطات التالية في ${country.nameAr} هي الأكبر قدرة؟`, en: `Which of these plants in ${country.nameEn} has the largest capacity?` },
          options: opts.map(c => ({ ar: plantLabel(c, 'ar'), en: plantLabel(c, 'en') })), correct: opts.indexOf(largest),
          explanation: { ar: opts.map(c => `${plantLabel(c, 'ar')}: ${fmt(c.capacityMw)} ميغاواط`).join('، '), en: opts.map(c => `${plantLabel(c, 'en')}: ${fmt(c.capacityMw)} MW`).join('; ') } };
        break;
      }
      case 'year': {
        if (!p.commissioningYear) continue;
        const y = p.commissioningYear;
        const ds2 = new Set(); let g = 0;
        while (ds2.size < 3 && g++ < 30) { const d = y + pick(rng, [-12, -8, -5, -3, 3, 5, 8, 12]); if (d !== y && d <= new Date().getFullYear() + 5) ds2.add(d); }
        const { options, correct } = makeOptions(rng, y, [...ds2], v => ({ ar: String(v), en: String(v) }));
        q = { prompt: { ar: `في أي عام دخلت محطة «${plantLabel(p, 'ar')}» الخدمة؟`, en: `In which year was "${plantLabel(p, 'en')}" commissioned?` }, options, correct,
          explanation: { ar: `سنة التشغيل المسجلة: ${y}.`, en: `Recorded commissioning year: ${y}.` } };
        break;
      }
      case 'energy': {
        const cf = tech.typicalCapacityFactor || 0.5;
        const gwh = Math.round(p.capacityMw * 8760 * cf / 1000);
        const { options, correct } = makeOptions(rng, gwh, distractorsAround(rng, gwh), v => ({ ar: `${fmt(v)} غيغاواط ساعة`, en: `${fmt(v)} GWh` }));
        q = { prompt: { ar: `إذا عملت محطة «${plantLabel(p, 'ar')}» (${fmt(p.capacityMw)} ميغاواط) بمعامل قدرة ${Math.round(cf * 100)}٪، فكم تبلغ طاقتها السنوية التقريبية؟`, en: `If "${plantLabel(p, 'en')}" (${fmt(p.capacityMw)} MW) operates at a ${Math.round(cf * 100)}% capacity factor, what is its approximate annual energy output?` }, options, correct,
          explanation: { ar: `الطاقة = القدرة × 8760 ساعة × معامل القدرة = ${fmt(p.capacityMw)} × 8760 × ${cf} ≈ ${fmt(gwh)} غيغاواط ساعة.`, en: `Energy = capacity × 8,760 h × capacity factor = ${fmt(p.capacityMw)} × 8760 × ${cf} ≈ ${fmt(gwh)} GWh.` } };
        break;
      }
      case 'heat': {
        if (!tech.heatRateKjPerKwh || tech.category !== 'thermal') continue;
        const eff = tech.efficiency;
        const mwth = Math.round(p.capacityMw / eff);
        const { options, correct } = makeOptions(rng, mwth, distractorsAround(rng, mwth), v => ({ ar: `${fmt(v)} ميغاواط حراري`, en: `${fmt(v)} MWth` }));
        q = { prompt: { ar: `محطة «${plantLabel(p, 'ar')}» بقدرة ${fmt(p.capacityMw)} ميغاواط وكفاءة ${Math.round(eff * 100)}٪. ما الطاقة الحرارية للوقود اللازمة عند الحمل الكامل؟`, en: `"${plantLabel(p, 'en')}" is rated ${fmt(p.capacityMw)} MW at ${Math.round(eff * 100)}% efficiency. What fuel heat input is required at full load?` }, options, correct,
          explanation: { ar: `الحرارة الداخلة = القدرة الكهربائية ÷ الكفاءة = ${fmt(p.capacityMw)} ÷ ${eff} ≈ ${fmt(mwth)} ميغاواط حراري.`, en: `Heat input = electrical output ÷ efficiency = ${fmt(p.capacityMw)} ÷ ${eff} ≈ ${fmt(mwth)} MWth.` } };
        break;
      }
      case 'co2': {
        if (!tech.co2KgPerMwh) continue;
        const cf = tech.typicalCapacityFactor || 0.5;
        const kt = Math.round(p.capacityMw * 8760 * cf * tech.co2KgPerMwh / 1e6);
        const { options, correct } = makeOptions(rng, kt, distractorsAround(rng, kt), v => ({ ar: `${fmt(v)} ألف طن`, en: `${fmt(v)} kt` }));
        q = { prompt: { ar: `بمعامل انبعاث ${tech.co2KgPerMwh} كغ CO₂/ميغاواط ساعة ومعامل قدرة ${Math.round(cf * 100)}٪، كم تبلغ انبعاثات محطة «${plantLabel(p, 'ar')}» (${fmt(p.capacityMw)} ميغاواط) السنوية تقريباً؟`, en: `With an emission factor of ${tech.co2KgPerMwh} kg CO₂/MWh and a ${Math.round(cf * 100)}% capacity factor, what are the approximate annual CO₂ emissions of "${plantLabel(p, 'en')}" (${fmt(p.capacityMw)} MW)?` }, options, correct,
          explanation: { ar: `الانبعاثات = ${fmt(p.capacityMw)} × 8760 × ${cf} × ${tech.co2KgPerMwh} ÷ 10⁶ ≈ ${fmt(kt)} ألف طن سنوياً.`, en: `Emissions = ${fmt(p.capacityMw)} × 8760 × ${cf} × ${tech.co2KgPerMwh} ÷ 10⁶ ≈ ${fmt(kt)} kt per year.` } };
        break;
      }
      case 'countryTotal': {
        const cands = shuffle(rng, ds.countries.filter(c => c.operationalMw > 0)).slice(0, 4);
        const top = cands.reduce((a, b) => (b.operationalMw > a.operationalMw ? b : a));
        q = { prompt: { ar: 'أي الدول التالية لديها أكبر قدرة توليد تشغيلية مسجلة في قاعدة بيانات البرنامج؟', en: 'Which of these countries has the largest operational generating capacity recorded in the application database?' },
          options: cands.map(c => ({ ar: c.nameAr, en: c.nameEn })), correct: cands.indexOf(top),
          explanation: { ar: cands.map(c => `${c.nameAr}: ${fmt(c.operationalMw)} ميغاواط`).join('، '), en: cands.map(c => `${c.nameEn}: ${fmt(c.operationalMw)} MW`).join('; ') } };
        break;
      }
      default: break;
    }
    if (!q) continue;
    used.add(key);
    questions.push({ id: `gen-${kind}-${p.id}-${questions.length}`, topic: p.technology, kind, generated: true, plantId: p.id, difficulty: ['energy', 'heat', 'co2'].includes(kind) ? 3 : 2, ...q });
  }
  return questions;
}

module.exports = { generate, mulberry32, seedFrom, shuffle };
