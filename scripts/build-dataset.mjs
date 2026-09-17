#!/usr/bin/env node
/**
 * Builds data/plants.json, data/countries.json and data/complexes.json from:
 *  - data/sources/gppd_v130_arab_subset.csv  (WRI Global Power Plant Database v1.3.0, CC BY 4.0)
 *  - data/sources/curated-plants.json         (plants added after the GPPD cut-off / missing countries)
 *  - data/sources/overrides.json              (corrections, Arabic names, technology classification)
 *  - data/sources/countries.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data', 'sources');
const OUT = path.join(ROOT, 'data');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/** Repairs double-encoded UTF-8 (e.g. "SociÃ©tÃ©" -> "Société") present in some GPPD owner names. */
function fixMojibake(s) {
  if (!s || !/[ÃÂâ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, ch => ch.charCodeAt(0) & 0xff);
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return fixed;
  } catch { return s; }
}

const titleCase = s => s.toLowerCase().replace(/(^|[\s\-(/])([a-z])/g, (m, p, c) => p + c.toUpperCase());

function classify(fuel, name, capacity) {
  const n = name.toLowerCase();
  switch (fuel) {
    case 'Gas':
      if (/ccgt|combined|cycle combine|\bcc\b|iwpp|power and water|cogen|co-generation/.test(n)) return 'ccgt';
      if (/ocgt|\bgt\b|turbine|\btg\b|mobile/.test(n)) return 'ocgt';
      if (/steam|swcc|thermal/.test(n)) return 'steam_oil';
      return capacity >= 400 ? 'ccgt' : 'ocgt';
    case 'Oil':
      if (/steam|thermal|swcc|iwpp/.test(n)) return 'steam_oil';
      if (/diesel|ic power|engine/.test(n) || capacity < 60) return 'diesel';
      return capacity >= 600 ? 'steam_oil' : 'ocgt';
    case 'Solar':
      if (/iscc|csp|noor ouarzazate 1|noor ouarzazate 2|shams|solar\/thermal|miraah/.test(n)) return 'csp_trough';
      if (/noor ouarzazate 3/.test(n)) return 'csp_tower';
      return 'pv';
    case 'Hydro':
      if (/barrage|regulator/.test(n)) return 'hydro_ror';
      return capacity >= 60 ? 'hydro_dam' : 'hydro_ror';
    case 'Wind': return 'wind_onshore';
    case 'Coal': return 'coal_steam';
    case 'Biomass': return 'biomass';
    case 'Nuclear': return 'nuclear_pwr';
    case 'Waste': return 'waste_to_energy';
    default: return 'ocgt';
  }
}

const PREFIXES = [
  [/^BbSP\} /, 'Benban Solar Park – ', 'مجمع بنبان الشمسي – ', 'benban'],
  [/^MaSP\} /, "Ma'an Solar Park – ", 'مجمع معان الشمسي – ', 'maan-solar'],
];
const SUFFIXES = [/ Power Plant Jordan$/, / Power Plant Qatar$/, / Power Plant Syria$/, / Power Project Syria$/, / Jordan$/, / Qatar$/];

const COMPLEXES = {
  'jebel-ali': { nameEn: 'Jebel Ali Power & Desalination Complex (DEWA)', nameAr: 'مجمع جبل علي للطاقة وتحلية المياه (ديوا)', country: 'ARE' },
  'mbr-solar-park': { nameEn: 'Mohammed bin Rashid Al Maktoum Solar Park', nameAr: 'مجمع محمد بن راشد آل مكتوم للطاقة الشمسية', country: 'ARE', hero: 'mbr-solar-park' },
  'shuweihat': { nameEn: 'Shuweihat Power Complex', nameAr: 'مجمع الشويهات للطاقة', country: 'ARE' },
  'taweelah': { nameEn: 'Taweelah Power Complex', nameAr: 'مجمع الطويلة للطاقة', country: 'ARE' },
  'fujairah': { nameEn: 'Fujairah (Qidfa) Power Complex', nameAr: 'مجمع الفجيرة (قدفع) للطاقة', country: 'ARE' },
  'benban': { nameEn: 'Benban Solar Park', nameAr: 'مجمع بنبان للطاقة الشمسية', country: 'EGY', hero: 'pv-park' },
  'aswan': { nameEn: 'Aswan hydropower complex', nameAr: 'مجمع أسوان الكهرومائي', country: 'EGY', hero: 'aswan-high-dam' },
  'gulf-of-suez-wind': { nameEn: 'Gulf of Suez wind corridor', nameAr: 'ممر رياح خليج السويس', country: 'EGY', hero: 'wind-farm' },
  'noor-ouarzazate': { nameEn: 'Noor Ouarzazate Solar Complex', nameAr: 'مجمع نور ورزازات للطاقة الشمسية', country: 'MAR', hero: 'noor-ouarzazate' },
  'az-zour': { nameEn: 'Az Zour Power Complex', nameAr: 'مجمع الزور للطاقة', country: 'KWT' },
  'shagaya': { nameEn: 'Shagaya Renewable Energy Park', nameAr: 'مجمع الشقايا للطاقة المتجددة', country: 'KWT' },
  'ras-laffan': { nameEn: 'Ras Laffan Industrial City power complex', nameAr: 'مجمع رأس لفان للطاقة', country: 'QAT' },
  'ras-abu-fontas': { nameEn: 'Ras Abu Fontas power complex', nameAr: 'مجمع رأس أبو فنطاس', country: 'QAT' },
  'shuaibah': { nameEn: 'Shuaibah power & solar complex', nameAr: 'مجمع الشعيبة للطاقة', country: 'SAU' },
  'riyadh-pp': { nameEn: 'Riyadh power plants (PP3–PP14)', nameAr: 'محطات الرياض (PP3–PP14)', country: 'SAU' },
  'maan-solar': { nameEn: "Ma'an Development Area Solar Park", nameAr: 'مجمع معان للطاقة الشمسية', country: 'JOR' },
};

const countries = JSON.parse(fs.readFileSync(path.join(SRC, 'countries.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(SRC, 'overrides.json'), 'utf8'));
const curated = JSON.parse(fs.readFileSync(path.join(SRC, 'curated-plants.json'), 'utf8'));
const rows = parseCsv(fs.readFileSync(path.join(SRC, 'gppd_v130_arab_subset.csv'), 'utf8'));
const countryByIso = Object.fromEntries(countries.map(c => [c.iso3, c]));

const plants = [];
const usedOverrides = new Set();
for (const r of rows) {
  const iso = r.country;
  if (!countryByIso[iso]) continue;
  const rawName = r.name.trim();
  const key = `${iso}|${rawName}`;
  const ov = overrides[key] || {};
  if (overrides[key]) usedOverrides.add(key);
  if (ov.exclude) continue;
  let name = fixMojibake(rawName);
  let nameAr = ov.nameAr || null;
  let complex = ov.complex || null;
  for (const [re, en, ar, cx] of PREFIXES) {
    if (re.test(name)) { const rest = name.replace(re, ''); name = en + rest; nameAr = nameAr || ar + rest; complex = complex || cx; }
  }
  for (const re of SUFFIXES) name = name.replace(re, '');
  if (iso === 'SAU' && name === name.toUpperCase() && /[A-Z]{3}/.test(name)) name = titleCase(name);
  if (ov.name) name = ov.name;
  const capacity = ov.capacityMw ?? parseFloat(r.capacity_mw);
  const fuel = ov.fuel || r.primary_fuel;
  const technology = ov.technology || classify(fuel, name, capacity);
  const gen = {}, est = {};
  for (let y = 2013; y <= 2019; y++) { const v = r[`generation_gwh_${y}`]; if (v) gen[y] = parseFloat(v); }
  for (let y = 2013; y <= 2017; y++) { const v = r[`estimated_generation_gwh_${y}`]; if (v) est[y] = parseFloat(v); }
  const year = ov.commissioningYear ?? (r.commissioning_year ? Math.round(parseFloat(r.commissioning_year)) : null);
  plants.push({
    id: `gppd-${r.gppd_idnr}`,
    name, nameAr, country: iso,
    capacityMw: Math.round(capacity * 10) / 10,
    fuel, technology,
    lat: parseFloat(r.latitude), lon: parseFloat(r.longitude),
    commissioningYear: year,
    owner: fixMojibake(r.owner) || null,
    status: 'operational',
    dataQuality: 'gppd',
    source: r.source || 'WRI Global Power Plant Database',
    sourceUrl: r.url || 'https://datasets.wri.org/dataset/globalpowerplantdatabase',
    gppdId: r.gppd_idnr,
    complex,
    hero: ov.hero || null,
    excludeFromTotals: !!ov.excludeFromTotals,
    notesEn: ov.notesEn || null, notesAr: ov.notesAr || null,
    generationGwh: Object.keys(gen).length ? gen : null,
    estimatedGenerationGwh: Object.keys(est).length ? est : null,
  });
}
for (const k of Object.keys(overrides)) if (k !== '_comment' && !usedOverrides.has(k)) console.warn('override key not matched:', k);

for (const c of curated) {
  if (!countryByIso[c.country]) throw new Error('unknown country in curated: ' + c.id);
  plants.push({
    id: c.id, name: c.name, nameAr: c.nameAr || null, country: c.country,
    capacityMw: c.capacityMw, fuel: c.fuel, technology: c.technology,
    lat: c.lat, lon: c.lon, commissioningYear: c.commissioningYear ?? null,
    owner: c.owner || null, operator: c.operator || null,
    status: c.status || 'operational', dataQuality: c.dataQuality || 'approximate',
    source: c.source || 'curated', sourceUrl: c.sourceUrl || '',
    gppdId: null, complex: c.complex || null, hero: c.hero || null,
    excludeFromTotals: !!c.excludeFromTotals,
    units: c.units ?? null, unitCapacityMw: c.unitCapacityMw ?? null,
    descriptionEn: c.descriptionEn || null, descriptionAr: c.descriptionAr || null,
    facts: c.facts || null,
    notesEn: c.notesEn || null, notesAr: c.notesAr || null,
    generationGwh: null, estimatedGenerationGwh: null,
  });
}

// Unique names within a country.
const seen = new Map();
for (const p of plants) {
  const k = `${p.country}|${p.name}`;
  const n = (seen.get(k) || 0) + 1; seen.set(k, n);
  if (n > 1) p.name = `${p.name} (${n})`;
}
// Validate
for (const p of plants) {
  if (!(p.capacityMw > 0)) throw new Error('bad capacity ' + p.id);
  if (!(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180)) throw new Error('bad coords ' + p.id);
  if (!p.technology) throw new Error('missing technology ' + p.id);
}
plants.sort((a, b) => a.country.localeCompare(b.country) || b.capacityMw - a.capacityMw);

// Country stats
const countriesOut = countries.map(c => {
  const list = plants.filter(p => p.country === c.iso3);
  const operational = list.filter(p => p.status === 'operational' && !p.excludeFromTotals);
  const byFuel = {};
  for (const p of operational) byFuel[p.fuel] = Math.round(((byFuel[p.fuel] || 0) + p.capacityMw) * 10) / 10;
  return {
    ...c,
    plantCount: list.length,
    operationalCount: operational.length,
    operationalMw: Math.round(operational.reduce((a, p) => a + p.capacityMw, 0)),
    pipelineMw: Math.round(list.filter(p => p.status !== 'operational').reduce((a, p) => a + p.capacityMw, 0)),
    renewableMw: Math.round(operational.filter(p => ['Solar', 'Wind', 'Hydro', 'Biomass'].includes(p.fuel)).reduce((a, p) => a + p.capacityMw, 0)),
    byFuel,
  };
});

const complexesOut = Object.entries(COMPLEXES).map(([id, c]) => {
  const members = plants.filter(p => p.complex === id);
  return { id, ...c, memberIds: members.map(p => p.id), totalMw: Math.round(members.filter(p => p.status === 'operational').reduce((a, p) => a + p.capacityMw, 0)) };
});

const dataset = {
  generatedAt: new Date().toISOString(),
  version: 2,
  sources: [
    { id: 'gppd', name: 'WRI Global Power Plant Database v1.3.0', license: 'CC BY 4.0', url: 'https://datasets.wri.org/dataset/globalpowerplantdatabase' },
    { id: 'curated', name: 'Curated additions from operators, utilities, IRENA and press releases (2019–2026)', license: 'facts; see per-record source', url: '' },
  ],
  count: plants.length,
  plants,
};
fs.writeFileSync(path.join(OUT, 'plants.json'), JSON.stringify(dataset));
fs.writeFileSync(path.join(OUT, 'countries.json'), JSON.stringify(countriesOut, null, 1));
fs.writeFileSync(path.join(OUT, 'complexes.json'), JSON.stringify(complexesOut, null, 1));

const totalMw = plants.filter(p => p.status === 'operational' && !p.excludeFromTotals).reduce((a, p) => a + p.capacityMw, 0);
console.log(`plants: ${plants.length} (gppd ${plants.filter(p => p.gppdId).length}, curated ${plants.filter(p => !p.gppdId).length}); operational capacity ${Math.round(totalMw).toLocaleString()} MW`);
const techCount = {};
for (const p of plants) techCount[p.technology] = (techCount[p.technology] || 0) + 1;
console.log('by technology:', JSON.stringify(techCount));
console.log('by country:', countriesOut.map(c => `${c.iso3}:${c.plantCount}`).join(' '));
