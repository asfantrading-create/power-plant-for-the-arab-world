// Chart.js wrapper with theme-aware defaults.
import Chart from 'chart.js/auto';
import { isAr } from '../i18n.js';

export const FUEL_COLORS = { Gas: '#f5a524', Oil: '#a06cd5', Solar: '#f7d354', Wind: '#5ad8e6', Hydro: '#4f8ef7', Coal: '#8d99ae', Nuclear: '#ff6b9d', Biomass: '#7bd36b', Waste: '#c98f5a' };
export const PALETTE = ['#22b8cf', '#f7b529', '#3ccf7f', '#5aa9ff', '#ff6b9d', '#a06cd5', '#f5a524', '#8d99ae', '#7bd36b', '#c98f5a'];

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

export function makeChart(canvas, config) {
  const text = cssVar('--text-2') || '#a9bccd';
  const grid = cssVar('--border') || '#24405a';
  Chart.defaults.font.family = "'Cairo', 'Segoe UI', sans-serif";
  Chart.defaults.color = text;
  const cfg = JSON.parse(JSON.stringify({ ...config, data: undefined }));
  cfg.data = config.data;
  cfg.options = cfg.options || {};
  cfg.options.responsive = true;
  cfg.options.maintainAspectRatio = cfg.options.maintainAspectRatio ?? false;
  cfg.options.animation = cfg.options.animation ?? { duration: 300 };
  cfg.options.plugins = cfg.options.plugins || {};
  cfg.options.plugins.legend = { ...(cfg.options.plugins.legend || {}), rtl: isAr(), labels: { color: text, ...((cfg.options.plugins.legend || {}).labels || {}) } };
  if (cfg.options.scales) for (const s of Object.values(cfg.options.scales)) { s.grid = { color: grid, ...(s.grid || {}) }; s.ticks = { color: text, ...(s.ticks || {}) }; }
  // functions are lost by the JSON clone; re-attach callbacks the caller passed
  if (config.options?.plugins?.tooltip?.callbacks) cfg.options.plugins.tooltip = { ...(cfg.options.plugins.tooltip || {}), callbacks: config.options.plugins.tooltip.callbacks };
  if (config.options?.scales) for (const [k, s] of Object.entries(config.options.scales)) if (s.ticks?.callback) cfg.options.scales[k].ticks.callback = s.ticks.callback;
  return new Chart(canvas, cfg);
}

export function lineChart(canvas, { labels, series, yTitle, yMin, yMax, y2 }) {
  const scales = { x: { ticks: { maxTicksLimit: 8, maxRotation: 0 } }, y: { title: { display: !!yTitle, text: yTitle }, min: yMin, max: yMax, beginAtZero: yMin === undefined } };
  if (y2) scales.y2 = { position: 'right', min: y2.min, max: y2.max, grid: { drawOnChartArea: false }, title: { display: !!y2.title, text: y2.title } };
  return makeChart(canvas, {
    type: 'line',
    data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, borderColor: s.color || PALETTE[i], backgroundColor: (s.color || PALETTE[i]) + '33', fill: s.fill ?? false, tension: .25, pointRadius: 0, borderWidth: 2, yAxisID: s.axis || 'y' })) },
    options: { scales, plugins: { legend: { display: series.length > 1, position: 'bottom' } }, interaction: { mode: 'index', intersect: false } },
  });
}
export function barChart(canvas, { labels, data, colors, label, horizontal = false, stacked = false, datasets }) {
  const ds = datasets || [{ label, data, backgroundColor: colors || PALETTE[0], borderRadius: 4 }];
  return makeChart(canvas, { type: 'bar', data: { labels, datasets: ds }, options: { indexAxis: horizontal ? 'y' : 'x', scales: { x: { stacked, ticks: { autoSkip: false, maxRotation: 45 } }, y: { stacked, beginAtZero: true } }, plugins: { legend: { display: !!datasets && datasets.length > 1, position: 'bottom' } } } });
}
export function doughnutChart(canvas, { labels, data, colors }) {
  return makeChart(canvas, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors || PALETTE, borderWidth: 0 }] }, options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } } });
}
export function destroyChart(c) { try { c && c.destroy(); } catch { /* ignore */ } }
