import { t, L, isAr, extend } from '../i18n.js';
import { api } from '../api.js';
import { state, plantById, countryByIso, tech } from '../state.js';
import { h, clear, icon, fmt, badge, fuelBadge, toast, selectEl, empty } from '../ui.js';
import { lineChart, destroyChart } from '../lib/charts.js';
import { PlantSimulation } from '../twin/engine.js';
import { TwinScene } from '../twin/scenes.js';
import { navigate } from '../app.js';

extend({
  ar: { 'ev.unitStarting': 'بدء إقلاع الوحدة {unit}', 'ev.unitOnline': 'الوحدة {unit} متزامنة مع الشبكة', 'ev.unitStopping': 'إيقاف الوحدة {unit}', 'ev.unitOff': 'الوحدة {unit} متوقفة', 'ev.unitTrip': 'فصل الوحدة {unit} – السبب: {reason}', 'ev.scenario': 'تفعيل سيناريو: {name}', 'al.frequency': 'انحراف تردد الشبكة ({f} هرتز)', 'al.vibration': 'اهتزاز مرتفع في الوحدة {unit} ({v} مم/ث)', 'al.exhaustTemp': 'حرارة عادم مرتفعة – الوحدة {unit} بحمل كامل في جو حار', 'al.plantOut': 'جميع الوحدات خارج الخدمة', 'al.soiling': 'تراكم غبار على الألواح ({pct}٪ فقد) – يلزم التنظيف', 'al.cellTemp': 'حرارة الخلايا مرتفعة ({t}°م)', 'al.storageLow': 'مخزون الحرارة منخفض ولا يوجد إشعاع', 'al.cutOut': 'رياح فوق سرعة الإيقاف ({v} م/ث) – التوربينات متوقفة حماية', 'al.spilling': 'الخزان ممتلئ – تصريف عبر المفيض', 'al.lowReservoir': 'منسوب الخزان منخفض', 'reason.vibration': 'اهتزاز', 'reason.protection': 'حماية كهربائية', 'reason.scenario': 'سيناريو تدريبي', 'twin.cleaning': 'تنظيف الألواح/المرايا', 'twin.soiling': 'فقد الغبار', 'twin.dust': 'الغبار', 'twin.inflow': 'التدفق الوارد', 'twin.gate': 'فتحة البوابات', 'twin.resetTrip': 'إعادة تسليح', 'twin.units_running': 'وحدة تعمل', 'twin.dni': 'الإشعاع المباشر', 'twin.field': 'حرارة الحقل الشمسي', 'twin.cellTemp': 'حرارة الخلايا', 'twin.exhaust': 'حرارة العادم', 'twin.reactor': 'القدرة الحرارية للمفاعل', 'twin.primary': 'حرارة الدائرة الأولية', 'twin.rpm': 'دوران الدوار', 'twin.speed1': 'حقيقي', 'twin.speedN': '×{n}', 'twin.fuelT': 'الوقود المتراكم', 'twin.co2T': 'CO₂ المتراكم' },
  en: { 'ev.unitStarting': 'Unit {unit} start-up initiated', 'ev.unitOnline': 'Unit {unit} synchronised to grid', 'ev.unitStopping': 'Unit {unit} shutting down', 'ev.unitOff': 'Unit {unit} off', 'ev.unitTrip': 'Unit {unit} TRIP – cause: {reason}', 'ev.scenario': 'Scenario activated: {name}', 'al.frequency': 'Grid frequency deviation ({f} Hz)', 'al.vibration': 'High vibration on unit {unit} ({v} mm/s)', 'al.exhaustTemp': 'High exhaust temperature – unit {unit} at full load in hot ambient', 'al.plantOut': 'All units out of service', 'al.soiling': 'Dust soiling on modules ({pct}% loss) – cleaning required', 'al.cellTemp': 'High cell temperature ({t} °C)', 'al.storageLow': 'Thermal storage low and no irradiance', 'al.cutOut': 'Wind above cut-out ({v} m/s) – turbines stopped for protection', 'al.spilling': 'Reservoir full – spilling', 'al.lowReservoir': 'Low reservoir level', 'reason.vibration': 'vibration', 'reason.protection': 'electrical protection', 'reason.scenario': 'training scenario', 'twin.cleaning': 'Clean modules / mirrors', 'twin.soiling': 'Soiling loss', 'twin.dust': 'Dust', 'twin.inflow': 'Inflow', 'twin.gate': 'Gate opening', 'twin.resetTrip': 'Reset trip', 'twin.units_running': 'units running', 'twin.dni': 'Direct irradiance', 'twin.field': 'Solar field heat', 'twin.cellTemp': 'Cell temperature', 'twin.exhaust': 'Exhaust temperature', 'twin.reactor': 'Reactor thermal power', 'twin.primary': 'Primary loop temperature', 'twin.rpm': 'Rotor speed', 'twin.speed1': 'real time', 'twin.speedN': '×{n}', 'twin.fuelT': 'Cumulative fuel', 'twin.co2T': 'Cumulative CO₂' },
});

const SPEEDS = [1, 10, 60, 300, 1800];

export async function render(container, params, ctx) {
  const p = plantById(params.id);
  if (!p) { container.append(empty(t('errors.not_found'))); return; }
  const tk = tech(p.technology); const c = countryByIso(p.country);
  ctx.setTitle(`${t('twin.title')}: ${L(p, 'name')}`);
  const sim = new PlantSimulation(p, tk, p.technology, { seed: Date.now() % 100000, ambientC: 30 });
  const startedAt = new Date().toISOString(); const startedReal = Date.now();
  let running = true, speed = 60, scene = null, raf = 0, saved = false;
  const isThermal = sim.isThermal, tc = p.technology;
  const isSolar = tc === 'pv' || tc === 'csp_tower' || tc === 'csp_trough';

  // ---- layout ----
  const canvas = h('canvas');
  const hud = h('div', { class: 'hud' }); const hudBr = h('div', { class: 'hud-br' });
  const viewport = h('div', { class: 'viewport' }, canvas, hud, hudBr);
  const simClock = h('span', { class: 'num' });
  const speedSel = selectEl(SPEEDS.map(s => ({ value: s, label: s === 1 ? t('twin.speed1') : t('twin.speedN', { n: s }) })), speed);
  speedSel.addEventListener('change', () => { speed = Number(speedSel.value); });
  const runBtn = h('button', { class: 'btn primary', onClick: () => { running = !running; runBtn.replaceChildren(icon(running ? 'pause' : 'play'), running ? t('twin.pause') : t('twin.start')); } }, icon('pause'), t('twin.pause'));
  const head = h('div', { class: 'head' },
    h('button', { class: 'btn ghost sm', onClick: () => navigate(`/plant/${p.id}`) }, icon('arrow'), t('common.back')),
    h('div', null, h('b', null, L(p, 'name')), ' ', h('span', { class: 'muted small' }, `${c.flag} ${L(c, 'name')} · ${L(tk, 'name')} · ${fmt.mw(p.capacityMw)}`)),
    p.hero ? badge(t('twin.heroModel'), 'primary') : badge(t('twin.generic')),
    h('div', { class: 'grow' }), runBtn,
    h('button', { class: 'btn', onClick: () => { sim.kpi = { energyMwh: 0, co2Tonnes: 0, fuelTonnes: 0, trips: 0, unavailableSec: 0, elapsedSec: 0 }; sim.history.length = 0; sim.state.events.length = 0; sim.state.alarms.length = 0; charts.forEach(ch => { if (!ch || !ch.data) return; ch.data.labels.length = 0; ch.data.datasets.forEach(d => { d.data.length = 0; }); ch.update('none'); }); } }, icon('reset'), t('twin.reset')),
    h('span', { class: 'muted small' }, t('twin.speed')), speedSel, h('span', { class: 'muted small' }, t('twin.simTime')), simClock);

  // ---- side panel: gauges / controls / units / kpis / alarms ----
  const gauges = h('div', { class: 'gauges' });
  const controls = h('div', { class: 'ctl' });
  const unitsBox = h('div');
  const kpiBox = h('dl', { class: 'kv' });
  const alarmBox = h('div', { class: 'alarm-list' });
  const scenarioBox = h('div', { class: 'chip-list' }, ['trip', 'heat', 'dust', 'gust', 'demand'].filter(s => (s === 'trip' ? isThermal || tc.startsWith('hydro') : true) && (s === 'gust' ? tc === 'wind_onshore' : true) && (s === 'dust' ? isSolar || isThermal : true)).map(s => h('span', { class: 'chip', onClick: () => sim.applyScenario(s) }, t('twin.scenario.' + s))),
    h('span', { class: 'chip', onClick: () => sim.clearScenario() }, t('twin.scenario.clear')));
  const side = h('div', { class: 'side' },
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.output')), gauges),
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.setpoint')), controls),
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.units')), unitsBox),
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.scenario')), scenarioBox),
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.kpis')), kpiBox),
    h('div', { class: 'card pad-sm' }, h('h4', null, t('twin.alarms')), alarmBox),
    h('button', { class: 'btn success', onClick: () => endSession(true) }, icon('check'), t('twin.endSession')),
    h('p', { class: 'muted small' }, t('twin.hint')));

  // controls
  const slider = (label, key, min, max, step, get, set, unit = '') => {
    const inp = h('input', { type: 'range', min, max, step, value: get() });
    const val = h('span', { class: 'val num' }, `${get()}${unit}`);
    inp.addEventListener('input', () => { set(Number(inp.value)); val.textContent = `${inp.value}${unit}`; });
    controls.append(h('label', { class: 'field' }, h('span', null, label, val), inp));
    return { inp, val, sync: () => { const v = get(); inp.value = v; val.textContent = `${Math.round(v * 100) / 100}${unit}`; } };
  };
  const sliders = [];
  if (tc.startsWith('hydro')) { sliders.push(slider(t('twin.gate'), 'gate', 0, 100, 1, () => Math.round(sim.controls.gateFrac * 100), v => { sim.controls.gateFrac = v / 100; }, '%')); sliders.push(slider(t('twin.inflow'), 'inflow', 0, 120, 1, () => Math.round(sim.env.flowFrac * 100), v => { sim.env.flowFrac = v / 100; }, '%')); }
  else sliders.push(slider(t('twin.setpoint'), 'sp', 0, 100, 1, () => Math.round(sim.controls.setpoint * 100), v => { sim.controls.setpoint = v / 100; }, '%'));
  sliders.push(slider(t('twin.ambient'), 'amb', 0, 55, 1, () => sim.env.ambientC, v => { sim.env.ambientC = v; }, '°C'));
  if (isSolar || isThermal) sliders.push(slider(t('twin.cloud'), 'cloud', 0, 100, 5, () => Math.round(sim.env.cloud * 100), v => { sim.env.cloud = v / 100; }, '%'));
  if (isSolar) sliders.push(slider(t('twin.dust'), 'dust', 0, 100, 5, () => Math.round(sim.env.dust * 100), v => { sim.env.dust = v / 100; }, '%'));
  if (tc === 'wind_onshore') sliders.push(slider(t('twin.wind'), 'wind', 0, 35, .5, () => sim.env.windMs, v => { sim.env.windMs = v; }, ' m/s'));
  if (isThermal || tc.startsWith('hydro') || tc === 'wind_onshore' || isSolar) sliders.push(slider(t('twin.demand'), 'dem', 20, 120, 5, () => Math.round(sim.env.demandFrac * 100), v => { sim.env.demandFrac = v / 100; }, '%'));
  if (isSolar) { const cb = h('input', { type: 'checkbox' }); cb.addEventListener('change', () => { sim.controls.cleaning = cb.checked; }); controls.append(h('label', { class: 'check' }, cb, t('twin.cleaning'))); }

  // bottom charts
  const cv1 = h('canvas'), cv2 = h('canvas');
  const bottom = h('div', { class: 'bottom' }, h('div', { class: 'card' }, h('div', { class: 'small muted' }, t('twin.trend')), cv1), h('div', { class: 'card' }, h('div', { class: 'small muted' }, t('twin.trend2')), cv2));
  const wrap = h('div', { class: 'twin' }, head, viewport, side, bottom);
  container.append(wrap);
  const cond = tc === 'wind_onshore' ? { key: 'wind', label: t('twin.wind') + ' (m/s)', color: '#5ad8e6' } : isSolar ? { key: 'ghi', label: t('twin.irradiance') + ' (W/m²)', color: '#f7d354' } : tc.startsWith('hydro') ? { key: 'level', label: t('twin.reservoir') + ' (%)', color: '#4f8ef7' } : { key: 'eff', label: t('twin.efficiency') + ' (%)', color: '#3ccf7f' };
  const charts = [
    lineChart(cv1, { labels: [], series: [{ label: t('twin.output'), data: [], color: '#22b8cf', fill: true }, { label: t('twin.demand'), data: [], color: '#f7b529' }], yMin: 0, yMax: Math.round(p.capacityMw * 1.1) }),
    lineChart(cv2, { labels: [], series: [{ label: cond.label, data: [], color: cond.color }, { label: t('twin.frequency'), data: [], color: '#ff6b9d', axis: 'y2' }], y2: { min: sim.nominalHz - 1.5, max: sim.nominalHz + 1.5 } }),
  ];
  let lastHist = 0;
  const timeLabel = ms => { const d = new Date(ms + sim.tz * 3600000); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

  try { scene = new TwinScene(canvas, p, tc, sim); } catch (err) { console.error(err); viewport.append(h('div', { class: 'alert error', style: { position: 'absolute', inset: '10px' } }, 'WebGL: ' + err.message)); }
  hudBr.append(h('button', { class: 'btn sm', onClick: () => { if (scene) scene.autoOrbit = !scene.autoOrbit; } }, t('twin.orbit')));
  const ro = new ResizeObserver(() => scene && scene.resize()); ro.observe(viewport);

  // ---- render helpers ----
  const gauge = (label, value, pct, cls = '') => h('div', { class: 'gauge' }, h('span', null, label), h('b', { class: 'num' }, value), pct !== null ? h('div', { class: 'bar' }, h('i', { style: { width: `${Math.max(0, Math.min(100, pct))}%`, background: cls || 'var(--primary)' } })) : null);
  function drawGauges() {
    const s = sim.state, cap = p.capacityMw;
    clear(gauges);
    gauges.append(gauge(t('twin.output'), fmt.mw(s.outputMw, 1), s.outputMw / cap * 100), gauge(t('twin.demand'), fmt.mw(s.demandMw, 0), s.demandMw / cap * 100, 'var(--accent)'),
      gauge(t('twin.frequency'), `${s.frequencyHz.toFixed(2)} ${t('twin.gridHz')}`, 50 + (s.frequencyHz - sim.nominalHz) / 1.5 * 50, Math.abs(s.frequencyHz - sim.nominalHz) > .3 ? 'var(--danger)' : 'var(--success)'),
      gauge(t('twin.efficiency'), fmt.pct(s.efficiency * 100, 1), s.efficiency * 100));
    if (isThermal) { gauges.append(gauge(t('twin.fuel'), tc === 'nuclear_pwr' ? `${fmt.num(s.reactorMwth)} MWth` : `${fmt.num(s.fuelKgS * 3.6, 1)} t/h`, null), gauge(t('twin.co2'), `${fmt.num(s.co2KgS * 3.6, 1)} t/h`, null)); if (tc === 'ccgt' || tc === 'ocgt') gauges.append(gauge(t('twin.exhaust'), `${fmt.num(s.exhaustTempC)} °C`, s.exhaustTempC / 650 * 100, 'var(--warning)')); if (s.steamPressureBar) gauges.append(gauge(t('twin.pressure'), `${fmt.num(s.steamPressureBar)} bar · ${fmt.num(s.steamTempC)} °C`, null)); if (tc === 'nuclear_pwr') gauges.append(gauge(t('twin.primary'), `${fmt.num(s.primaryTempC)} °C`, null)); }
    if (isSolar) { gauges.append(gauge(t('twin.sunElevation'), `${s.sun ? s.sun.elevation.toFixed(1) : 0}°`, s.sun ? s.sun.elevation / 90 * 100 : 0, 'var(--accent)'), gauge(tc === 'pv' ? t('twin.irradiance') : t('twin.dni'), `${fmt.num(tc === 'pv' ? s.ghi : s.dni)} W/m²`, (tc === 'pv' ? s.ghi : s.dni) / 10, 'var(--accent)')); if (tc === 'pv') gauges.append(gauge(t('twin.cellTemp'), `${fmt.num(s.cellTempC)} °C`, s.cellTempC / 90 * 100, 'var(--warning)'), gauge(t('twin.soiling'), fmt.pct(s.soiling * 100, 1), s.soiling * 100 / 35, 'var(--danger)')); else gauges.append(gauge(t('twin.storage'), `${fmt.num(s.storageMwh)} / ${fmt.num(s.storageMaxMwh)} MWh`, s.storageMwh / s.storageMaxMwh * 100, 'var(--warning)'), gauge(t('twin.field'), `${fmt.num(s.fieldMwth)} MWth`, null)); }
    if (tc === 'wind_onshore') gauges.append(gauge(t('twin.wind'), `${s.windHub.toFixed(1)} m/s`, s.windHub / 30 * 100), gauge(t('twin.rpm'), `${s.rotorRpm.toFixed(1)} rpm`, s.rotorRpm / 16 * 100));
    if (tc.startsWith('hydro')) gauges.append(gauge(t('twin.reservoir'), fmt.pct(s.reservoirLevel * 100, 1), s.reservoirLevel * 100, 'var(--info)'), gauge(t('twin.flow'), `${fmt.num(s.flowM3s)} m³/s · ${fmt.num(s.headM, 1)} m`, null));
  }
  function drawUnits() {
    clear(unitsBox);
    const list = sim.units.slice(0, 24);
    for (const u of list) {
      const st = u.state;
      unitsBox.append(h('div', { class: 'unit-row' }, h('span', { class: `dot ${st === 'on' ? 'on' : st === 'starting' ? 'starting' : st === 'trip' ? 'trip' : ''}` }), h('b', null, u.name), h('span', { class: 'muted small' }, t('twin.state' + st.charAt(0).toUpperCase() + st.slice(1))), h('span', { class: 'grow num small' }, `${fmt.num(u.output, 1)} / ${fmt.num(u.capacityMw)} MW`),
        st === 'trip' ? h('button', { class: 'btn sm', onClick: () => sim.resetUnit(u.id) }, t('twin.resetTrip')) : st === 'off' ? h('button', { class: 'btn sm', onClick: () => sim.startUnit(u.id) }, t('twin.startUnit')) : (st === 'on' || st === 'starting') ? h('button', { class: 'btn sm ghost', onClick: () => sim.stopUnit(u.id) }, t('twin.stopUnit')) : null));
    }
    if (sim.units.length > 24) unitsBox.append(h('div', { class: 'muted small' }, `+${sim.units.length - 24} …`));
  }
  function drawKpis() {
    const k = sim.kpis(); clear(kpiBox);
    const rows = [[t('twin.energy'), `${fmt.num(k.energyMwh, 1)} MWh`], [t('twin.capacityFactor'), fmt.pct(k.capacityFactor * 100, 1)], [t('twin.availability'), fmt.pct(k.availability * 100, 1)], [t('twin.trips'), String(k.trips)]];
    if (isThermal && tc !== 'nuclear_pwr') rows.push([t('twin.fuelT'), `${fmt.num(k.fuelTonnes, 1)} t`], [t('twin.co2T'), `${fmt.num(k.co2Tonnes, 1)} t`]);
    for (const [a, b] of rows) kpiBox.append(h('dt', null, a), h('dd', { class: 'num' }, b));
  }
  const fmtEv = ev => t(ev.key, { ...ev.vars, reason: ev.vars.reason ? t('reason.' + ev.vars.reason) : '', name: ev.vars.name ? t('twin.scenario.' + ev.vars.name) : '' });
  function drawAlarms() {
    clear(alarmBox);
    const active = sim.state.alarms;
    if (!active.length && !sim.state.events.length) { alarmBox.append(h('div', { class: 'muted small' }, t('twin.noAlarms'))); return; }
    for (const a of active) alarmBox.append(h('div', { class: `alarm ${a.level}` }, fmtEv(a)));
    for (const ev of sim.state.events.slice(-12).reverse()) alarmBox.append(h('div', { class: `alarm ${ev.level === 'trip' ? 'trip' : ev.level === 'info' ? 'info' : ''}`, style: { opacity: .8 } }, h('time', null, timeLabel(ev.t)), fmtEv(ev)));
  }
  function drawHud() {
    const s = sim.state; clear(hud);
    hud.append(h('span', { class: 'pill' }, `${fmt.mw(s.outputMw, 1)}`), h('span', { class: 'pill' }, `${s.frequencyHz.toFixed(2)} Hz`), h('span', { class: 'pill' }, `${t('twin.hourOfDay')} ${timeLabel(sim.simTime)} · ☀ ${s.sun ? s.sun.elevation.toFixed(0) : 0}°`), h('span', { class: 'pill' }, `${sim.env.ambientC}°C`), h('span', { class: 'pill' }, `${sim.units.filter(u => u.state === 'on').length}/${sim.units.length} ${t('twin.units_running')}`));
  }
  function pushHistory() {
    if (!charts.every(ch => ch && ch.data)) return; // canvas context unavailable (e.g. GPU disabled): skip trend charts
    const hist = sim.history; if (!hist.length || hist[hist.length - 1].t === lastHist) return;
    const newPts = hist.filter(x => x.t > lastHist); lastHist = hist[hist.length - 1].t;
    for (const pt of newPts) { charts[0].data.labels.push(timeLabel(pt.t)); charts[0].data.datasets[0].data.push(Math.round(pt.out * 10) / 10); charts[0].data.datasets[1].data.push(Math.round(pt.demand)); charts[1].data.labels.push(timeLabel(pt.t)); charts[1].data.datasets[0].data.push(Math.round(pt[cond.key] * 10) / 10); charts[1].data.datasets[1].data.push(Math.round(pt.freq * 100) / 100); }
    for (const ch of charts) { while (ch.data.labels.length > 240) { ch.data.labels.shift(); ch.data.datasets.forEach(d => d.data.shift()); } ch.update('none'); }
  }

  // ---- main loop ----
  let lastReal = performance.now(), uiAcc = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dtReal = Math.min(.25, (now - lastReal) / 1000); lastReal = now;
    let simDt = 0;
    if (running) { simDt = dtReal * speed; sim.tick(simDt); }
    if (scene) scene.frame(simDt);
    uiAcc += dtReal;
    if (uiAcc > .33) { uiAcc = 0; drawGauges(); drawUnits(); drawKpis(); drawAlarms(); drawHud(); pushHistory(); simClock.textContent = new Date(sim.simTime + sim.tz * 3600000).toISOString().slice(0, 16).replace('T', ' '); sliders.forEach(s => s.sync()); }
  }
  raf = requestAnimationFrame(loop);

  async function endSession(navigateAway) {
    if (saved) return; saved = true;
    const k = sim.kpis();
    try { await api('twin:logSession', { plantId: p.id, plantName: L(p, 'name'), startedAt, durationSec: Math.round((Date.now() - startedReal) / 1000), kpis: { energyMwh: Math.round(k.energyMwh * 10) / 10, capacityFactor: Math.round(k.capacityFactor * 1000) / 1000, availability: Math.round(k.availability * 1000) / 1000, trips: k.trips, co2Tonnes: Math.round(k.co2Tonnes * 10) / 10, simHours: Math.round(k.hours * 10) / 10 }, events: sim.state.events.slice(-100).map(e => ({ t: e.t, level: e.level, text: fmtEv(e) })) }); if (navigateAway) { toast(t('twin.sessionSaved'), 'success'); navigate(`/plant/${p.id}`); } }
    catch { /* offline or unauthenticated: ignore */ }
  }
  return () => { cancelAnimationFrame(raf); ro.disconnect(); charts.forEach(destroyChart); if (scene) scene.dispose(); if (Date.now() - startedReal > 20000) endSession(false); };
}
