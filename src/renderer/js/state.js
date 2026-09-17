// Global renderer state with a tiny pub/sub.
export const state = {
  boot: null, user: null, settings: null, license: null, updater: null,
  dataset: null, map: null, lang: 'ar', theme: 'dark', route: { name: 'dashboard', params: {} },
  cache: {},
};
const subs = new Set();
export function setState(patch) { Object.assign(state, patch); for (const fn of subs) fn(state); }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function plantById(id) {
  if (!state.dataset) return null;
  if (!state.cache.plantIndex) state.cache.plantIndex = new Map(state.dataset.plants.map(p => [p.id, p]));
  return state.cache.plantIndex.get(id) || null;
}
export function countryByIso(iso) {
  if (!state.dataset) return null;
  if (!state.cache.countryIndex) state.cache.countryIndex = new Map(state.dataset.countries.map(c => [c.iso3, c]));
  return state.cache.countryIndex.get(iso) || null;
}
export function complexById(id) {
  if (!state.dataset) return null;
  return state.dataset.complexes.find(c => c.id === id) || null;
}
export function tech(code) { return state.dataset ? state.dataset.technologies[code] || null : null; }
/** Effective license features: { modules: [...], technologies: [...]|null }. */
export function features() {
  const f = state.license && state.license.features;
  return f && Array.isArray(f.modules) ? f : { modules: ['twin', 'exams'], technologies: null };
}
export function hasModule(m) { return features().modules.includes(m); }
export function techAllowed(code) { const t = features().technologies; return !t || t.includes(code); }
export function isRole(min) {
  const rank = { superadmin: 3, instructor: 2, student: 1 };
  return !!state.user && rank[state.user.role] >= rank[min];
}
