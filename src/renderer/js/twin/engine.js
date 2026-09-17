// Physics-based (simplified) plant simulation. All quantities SI-ish: MW, MWth, °C, m/s, m³/s, seconds.
import { sunPosition, clearSkyGhi, clearSkyDni, cloudFactorGhi, cloudFactorDni, tzOffsetHours } from './solar.js';

const FUEL_LHV = { Gas: 50, Oil: 42, Coal: 25, Waste: 10, Biomass: 16, Nuclear: 0, Solar: 0, Wind: 0, Hydro: 0 }; // MJ/kg
const CO2_PER_MWH_TH = { Gas: 0.202, Oil: 0.267, Coal: 0.341, Waste: 0.09, Biomass: 0, Nuclear: 0, Solar: 0, Wind: 0, Hydro: 0 }; // t/MWh thermal
const THERMAL = new Set(['ccgt', 'ocgt', 'steam_oil', 'coal_steam', 'diesel', 'nuclear_pwr', 'biomass', 'waste_to_energy', 'igcc', 'oil_shale']);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function gauss(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function unitLayout(plant, tech) {
  const cap = plant.capacityMw;
  if (plant.units && plant.unitCapacityMw) return { count: plant.units, unitMw: plant.unitCapacityMw };
  const per = { ccgt: 450, ocgt: 120, steam_oil: 350, coal_steam: 350, diesel: 12, nuclear_pwr: 1200, biomass: 30, waste_to_energy: 40, igcc: 950, oil_shale: 235, hydro_dam: 150, hydro_ror: 20, pv: 50, csp_trough: 100, csp_tower: 100, wind_onshore: 3 }[tech] || 200;
  let count = Math.max(1, Math.round(cap / per));
  if (tech === 'wind_onshore') count = clamp(Math.round(cap / 3), 3, 150);
  if (tech === 'pv') count = clamp(count, 2, 24);
  if (tech === 'diesel') count = clamp(count, 2, 16);
  if (tech === 'nuclear_pwr') count = plant.units || Math.max(1, Math.round(cap / 1400));
  count = clamp(count, 1, 24 * (tech === 'wind_onshore' ? 7 : 1));
  return { count, unitMw: cap / count };
}

export class PlantSimulation {
  constructor(plant, tech, techCode, opts = {}) {
    this.plant = plant; this.tech = tech; this.techCode = techCode;
    this.rng = mulberry32(opts.seed || 12345);
    this.isThermal = THERMAL.has(techCode);
    const layout = unitLayout(plant, techCode);
    this.unitMw = layout.unitMw;
    this.units = Array.from({ length: layout.count }, (_, i) => ({ id: i + 1, name: `U${i + 1}`, capacityMw: layout.unitMw, state: 'off', output: 0, progress: 0, vibration: 2 + this.rng(), temp: 25, hours: 0, tripReason: null }));
    const start = opts.startTime ? new Date(opts.startTime) : new Date();
    this.simTime = start.getTime();
    this.startSimTime = this.simTime;
    this.tz = tzOffsetHours(plant.lon);
    this.env = { ambientC: opts.ambientC ?? 32, cloud: 0.1, dust: 0.05, windMs: 8, flowFrac: 0.6, demandFrac: 0.8, gridDeviation: 0 };
    this.controls = { setpoint: 0.9, gateFrac: 0.8, cleaning: false };
    this.kpi = { energyMwh: 0, co2Tonnes: 0, fuelTonnes: 0, trips: 0, unavailableSec: 0, elapsedSec: 0 };
    this.state = { outputMw: 0, availableMw: 0, efficiency: 0, heatMwth: 0, fuelKgS: 0, co2KgS: 0, frequencyHz: plant.country === 'SAU' ? 60 : 50, alarms: [], events: [], sun: null, ghi: 0, dni: 0, cellTempC: 25, soiling: 0.02, storageMwh: 0, storageMaxMwh: 0, fieldMwth: 0, reservoirLevel: 0.85, headM: 0, flowM3s: 0, windHub: 8, rotorRpm: 0, reactorMwth: 0, primaryTempC: 290, steamPressureBar: 0, steamTempC: 0, exhaustTempC: 0, demandMw: 0 };
    this.scenario = null; this.scenarioT = 0;
    this.nominalHz = this.state.frequencyHz;
    this.history = [];
    this._lastHistoryT = -Infinity;
    this.initTech();
    if (opts.autoStart !== false) this.startAll(true);
  }

  initTech() {
    const s = this.state, t = this.techCode, cap = this.plant.capacityMw;
    if (t === 'csp_tower' || t === 'csp_trough') { s.storageMaxMwh = cap / (t === 'csp_tower' ? 0.40 : 0.37) * (t === 'csp_tower' ? 10 : 5); s.storageMwh = s.storageMaxMwh * 0.4; }
    if (t === 'hydro_dam' || t === 'hydro_ror') { s.headM = t === 'hydro_dam' ? (this.plant.id === 'gppd-WRI1019990' ? 74 : 60) : 8; s.reservoirLevel = 0.85; }
    if (t === 'wind_onshore') { this.rotorD = Math.sqrt(this.unitMw * 1e6 / (0.5 * 1.225 * 0.45 * Math.pow(12, 3) * Math.PI / 4)); }
    this.state.demandMw = cap * this.env.demandFrac;
  }

  log(level, key, vars) { const ev = { t: this.simTime, level, key, vars: vars || {} }; this.state.events.push(ev); if (this.state.events.length > 400) this.state.events.shift(); return ev; }
  setAlarm(id, level, key, vars) { const a = this.state.alarms.find(x => x.id === id); if (!a) { this.state.alarms.push({ id, level, key, vars: vars || {}, t: this.simTime }); this.log(level, key, vars); } }
  clearAlarm(id) { this.state.alarms = this.state.alarms.filter(a => a.id !== id); }

  startAll(instant = false) { for (const u of this.units) this.startUnit(u.id, instant); }
  startUnit(id, instant = false) {
    const u = this.units.find(x => x.id === id); if (!u || u.state === 'on' || u.state === 'starting') return;
    if (instant) { u.state = 'on'; u.output = u.capacityMw * Math.max(this.tech.minLoad || 0.1, 0.5); u.progress = 1; u.tripReason = null; return; }
    u.state = 'starting'; u.progress = 0; u.tripReason = null; this.log('info', 'ev.unitStarting', { unit: u.name });
  }
  stopUnit(id) { const u = this.units.find(x => x.id === id); if (!u || u.state === 'off') return; u.state = 'stopping'; this.log('info', 'ev.unitStopping', { unit: u.name }); }
  tripUnit(id, reason) { const u = this.units.find(x => x.id === id); if (!u || !(u.state === 'on' || u.state === 'starting')) return; u.state = 'trip'; u.output = 0; u.tripReason = reason; this.kpi.trips++; this.log('trip', 'ev.unitTrip', { unit: u.name, reason }); this.state.gridShock = (this.state.gridShock || 0) - u.capacityMw; }
  resetUnit(id) { const u = this.units.find(x => x.id === id); if (u && u.state === 'trip') { u.state = 'off'; u.tripReason = null; u.vibration = 2 + this.rng(); } }

  applyScenario(name) {
    this.scenario = name; this.scenarioT = 0;
    if (name === 'trip') { const on = this.units.filter(u => u.state === 'on'); if (on.length) this.tripUnit(on[Math.floor(this.rng() * on.length)].id, 'scenario'); this.scenario = null; }
    if (name === 'heat') { this.env.ambientC = 48; }
    if (name === 'dust') { this.env.dust = 0.85; this.env.cloud = Math.max(this.env.cloud, 0.3); }
    if (name === 'gust') { this.env.windMs = 27; }
    if (name === 'demand') { this.env.demandFrac = Math.min(1.2, this.env.demandFrac + 0.25); }
    this.log('warn', 'ev.scenario', { name });
  }
  clearScenario() { this.scenario = null; this.env.dust = 0.05; if (this.env.windMs > 25) this.env.windMs = 9; this.env.demandFrac = 0.8; if (this.env.ambientC > 45) this.env.ambientC = 35; }

  /** Advance simulation by dt seconds (sim time). Internally sub-stepped. */
  tick(dtSec) {
    let remaining = dtSec;
    while (remaining > 0) { const h = Math.min(remaining, 30); this.step(h); remaining -= h; }
  }

  step(dt) {
    const s = this.state, env = this.env, cap = this.plant.capacityMw, t = this.techCode, tech = this.tech;
    this.simTime += dt * 1000;
    this.kpi.elapsedSec += dt;
    const date = new Date(this.simTime);
    s.sun = sunPosition(date, this.plant.lat, this.plant.lon);
    const elev = s.sun.elevation;
    s.ghi = clearSkyGhi(elev) * cloudFactorGhi(env.cloud) * (1 - 0.5 * env.dust);
    s.dni = clearSkyDni(elev) * cloudFactorDni(env.cloud) * (1 - 0.9 * env.dust);
    // scenario decay
    if (this.scenario === 'dust') { this.scenarioT += dt; if (this.scenarioT > 2 * 3600) { env.dust = Math.max(0.05, env.dust - dt / 3600 * 0.3); if (env.dust <= 0.06) this.scenario = null; } }
    if (this.scenario === 'gust') { this.scenarioT += dt; if (this.scenarioT > 20 * 60) { env.windMs = 9; this.scenario = null; } }
    // demand: diurnal pattern around demandFrac (Gulf-style afternoon peak)
    const localHour = ((date.getUTCHours() + this.tz + 24) % 24) + date.getUTCMinutes() / 60;
    const diurnal = 0.85 + 0.15 * Math.sin((localHour - 9) / 24 * 2 * Math.PI);
    s.demandMw = cap * env.demandFrac * diurnal;

    // unit state machines
    let available = 0;
    for (const u of this.units) {
      if (u.state === 'starting') {
        const startSec = Math.max(60, (tech.startupMinutes || 30) * 60);
        u.progress = clamp(u.progress + dt / startSec, 0, 1);
        u.output = u.capacityMw * (tech.minLoad || 0.1) * u.progress;
        if (u.progress >= 1) { u.state = 'on'; this.log('info', 'ev.unitOnline', { unit: u.name }); }
      } else if (u.state === 'stopping') {
        u.output = Math.max(0, u.output - u.capacityMw * (tech.rampRatePctPerMin || 5) / 100 * dt / 60 * 2);
        if (u.output <= 0.5) { u.output = 0; u.state = 'off'; this.log('info', 'ev.unitOff', { unit: u.name }); }
      } else if (u.state === 'trip' || u.state === 'off') u.output = 0;
      if (u.state === 'on' || u.state === 'starting') available += u.capacityMw;
      if (u.state !== 'on' && u.state !== 'starting') this.kpi.unavailableSec += dt / this.units.length;
      if (u.state === 'on') u.hours += dt / 3600;
    }
    s.availableMw = available;

    let output = 0, heat = 0;
    if (this.isThermal) output = this.stepThermal(dt);
    else if (t === 'pv') output = this.stepPv(dt);
    else if (t === 'csp_tower' || t === 'csp_trough') output = this.stepCsp(dt);
    else if (t === 'wind_onshore') output = this.stepWind(dt);
    else output = this.stepHydro(dt);
    s.outputMw = Math.max(0, output);
    // efficiency / fuel / CO2
    if (this.isThermal) {
      heat = s.efficiency > 0 ? s.outputMw / s.efficiency : 0;
      s.heatMwth = heat;
      const lhv = FUEL_LHV[this.plant.fuel] || 0;
      s.fuelKgS = lhv ? heat / lhv : 0;
      s.co2KgS = (CO2_PER_MWH_TH[this.plant.fuel] || 0) * heat / 3.6;
      if (t === 'nuclear_pwr') { s.reactorMwth = heat; s.primaryTempC = 290 + 35 * (s.outputMw / cap); s.fuelKgS = 0; s.co2KgS = 0; }
      if (t === 'ccgt' || t === 'ocgt') { s.exhaustTempC = s.outputMw > 0 ? 480 + 120 * (s.outputMw / Math.max(1, available)) : env.ambientC; }
      if (['steam_oil', 'coal_steam', 'nuclear_pwr', 'oil_shale', 'biomass', 'waste_to_energy', 'ccgt', 'igcc'].includes(t)) { const lf = available ? s.outputMw / available : 0; s.steamPressureBar = lf > 0 ? (t === 'nuclear_pwr' ? 60 + 10 * lf : t === 'coal_steam' ? 160 + 100 * lf : 90 + 60 * lf) : 0; s.steamTempC = lf > 0 ? (t === 'nuclear_pwr' ? 280 : 500 + 40 * lf) : env.ambientC; }
    } else { s.heatMwth = 0; s.fuelKgS = 0; s.co2KgS = 0; }
    this.kpi.energyMwh += s.outputMw * dt / 3600;
    this.kpi.co2Tonnes += s.co2KgS * dt / 1000;
    this.kpi.fuelTonnes += s.fuelKgS * dt / 1000;
    // grid frequency: first-order response to imbalance + trip shocks
    const imbalance = (s.outputMw - s.demandMw) / cap;
    const target = clamp(imbalance * 0.25, -1.5, 1.5);
    if (s.gridShock) { env.gridDeviation += (s.gridShock / cap) * 0.6; s.gridShock = 0; }
    env.gridDeviation += (target - env.gridDeviation) * clamp(dt / 120, 0, 1);
    s.frequencyHz = this.nominalHz + env.gridDeviation;
    if (Math.abs(env.gridDeviation) > 0.5) this.setAlarm('freq', 'warn', 'al.frequency', { f: s.frequencyHz.toFixed(2) }); else this.clearAlarm('freq');
    // history sampling (every 60 s of sim time)
    if (this.simTime - this._lastHistoryT >= 60000) {
      this._lastHistoryT = this.simTime;
      this.history.push({ t: this.simTime, out: s.outputMw, demand: s.demandMw, eff: s.efficiency * 100, freq: s.frequencyHz, ghi: s.ghi, wind: s.windHub, amb: env.ambientC, storage: s.storageMaxMwh ? s.storageMwh / s.storageMaxMwh * 100 : 0, level: s.reservoirLevel * 100 });
      if (this.history.length > 720) this.history.shift();
    }
  }

  stepThermal(dt) {
    const s = this.state, env = this.env, tech = this.tech, t = this.techCode;
    const derate = (t === 'ccgt' || t === 'ocgt' || t === 'igcc') ? clamp(1 - 0.0065 * (env.ambientC - 15), 0.7, 1.05) : clamp(1 - 0.002 * Math.max(0, env.ambientC - 25), 0.9, 1);
    const on = this.units.filter(u => u.state === 'on');
    const targetTotal = clamp(this.controls.setpoint, 0, 1) * on.reduce((a, u) => a + u.capacityMw * derate, 0);
    const minLoad = tech.minLoad || 0.3;
    const ramp = (tech.rampRatePctPerMin || 3) / 100 / 60; // fraction of unit capacity per second
    let total = 0;
    for (const u of this.units) {
      if (u.state !== 'on') { total += u.output; continue; }
      const maxU = u.capacityMw * derate;
      const share = on.length ? targetTotal / on.length : 0;
      const target = clamp(share, u.capacityMw * minLoad, maxU);
      const step = u.capacityMw * ramp * dt * (t === 'nuclear_pwr' ? 0.5 : 1);
      u.output = u.output < target ? Math.min(target, u.output + step) : Math.max(target, u.output - step);
      // temperatures & vibration
      const lf = u.output / u.capacityMw;
      u.temp += ((t === 'ccgt' || t === 'ocgt' ? 380 + 250 * lf : 60 + 40 * lf) + (env.ambientC - 25) * 0.5 - u.temp) * clamp(dt / 600, 0, 1);
      u.vibration += (gauss(this.rng) * 0.15 + (lf > 0.97 ? 0.05 : -0.02)) * Math.sqrt(dt / 60);
      u.vibration = clamp(u.vibration, 1, 12);
      if (u.vibration > 7) this.setAlarm('vib' + u.id, 'warn', 'al.vibration', { unit: u.name, v: u.vibration.toFixed(1) }); else this.clearAlarm('vib' + u.id);
      if (u.vibration > 10.5) this.tripUnit(u.id, 'vibration');
      if ((t === 'ccgt' || t === 'ocgt') && env.ambientC > 46 && lf > 0.95) this.setAlarm('temp' + u.id, 'warn', 'al.exhaustTemp', { unit: u.name }); else this.clearAlarm('temp' + u.id);
      if (this.rng() < (dt / 3600) * 0.0015) this.tripUnit(u.id, 'protection');
      total += u.output;
    }
    const lfPlant = s.availableMw ? total / s.availableMw : 0;
    const partLoad = t === 'ocgt' || t === 'diesel' ? 1 - 0.45 * Math.pow(1 - lfPlant, 1.5) : 1 - 0.3 * Math.pow(1 - lfPlant, 2);
    s.efficiency = total > 0 ? (tech.efficiency || 0.4) * partLoad * (t === 'ccgt' || t === 'ocgt' ? clamp(1 - 0.0015 * (env.ambientC - 15), 0.9, 1.02) : 1) : 0;
    if (on.length === 0 && this.units.some(u => u.state === 'trip')) this.setAlarm('allout', 'trip', 'al.plantOut'); else this.clearAlarm('allout');
    return total;
  }

  stepPv(dt) {
    const s = this.state, env = this.env, cap = this.plant.capacityMw;
    s.soiling = this.controls.cleaning ? 0.005 : clamp(s.soiling + (0.002 / 86400 + env.dust * 0.02 / 3600) * dt, 0, 0.35);
    s.cellTempC = env.ambientC + 0.031 * s.ghi;
    const on = this.units.filter(u => u.state === 'on').length / this.units.length;
    const dc = cap * 1.25 * (s.ghi / 1000) * (1 - 0.0035 * (s.cellTempC - 25)) * (1 - s.soiling) * on;
    const ac = Math.min(cap * clamp(this.controls.setpoint, 0, 1), Math.max(0, dc) * 0.98);
    for (const u of this.units) u.output = u.state === 'on' ? ac / Math.max(1, this.units.filter(x => x.state === 'on').length) : 0;
    s.efficiency = 0.21 * (1 - 0.0035 * (s.cellTempC - 25));
    if (s.soiling > 0.12) this.setAlarm('soil', 'warn', 'al.soiling', { pct: (s.soiling * 100).toFixed(0) }); else this.clearAlarm('soil');
    if (s.cellTempC > 70) this.setAlarm('celltemp', 'warn', 'al.cellTemp', { t: s.cellTempC.toFixed(0) }); else this.clearAlarm('celltemp');
    return ac;
  }

  stepCsp(dt) {
    const s = this.state, env = this.env, cap = this.plant.capacityMw, tower = this.techCode === 'csp_tower';
    const etaPb = tower ? 0.40 : 0.37, sm = tower ? 2.4 : 1.8, etaField = tower ? 0.55 : 0.6;
    s.fieldMwth = cap / etaPb * sm * (s.dni / 900) * etaField / 0.55 * (1 - s.soiling);
    s.soiling = this.controls.cleaning ? 0.01 : clamp(s.soiling + (0.001 / 86400 + env.dust * 0.03 / 3600) * dt, 0, 0.4);
    const on = this.units.filter(u => u.state === 'on').length / this.units.length;
    const want = cap * clamp(this.controls.setpoint, 0, 1) * on;
    const needTh = want / etaPb;
    let fromField = Math.min(s.fieldMwth, needTh);
    let deficit = needTh - fromField;
    const discharge = Math.min(deficit, s.storageMwh * 3600 / dt, cap / etaPb);
    s.storageMwh -= discharge * dt / 3600;
    const surplus = Math.max(0, s.fieldMwth - fromField);
    const charge = Math.min(surplus, (s.storageMaxMwh - s.storageMwh) * 3600 / dt);
    s.storageMwh = clamp(s.storageMwh + charge * dt / 3600 - s.storageMwh * 0.0002 * dt / 3600, 0, s.storageMaxMwh);
    const out = (fromField + discharge) * etaPb;
    for (const u of this.units) u.output = u.state === 'on' ? out / Math.max(1, this.units.filter(x => x.state === 'on').length) : 0;
    s.efficiency = etaPb;
    if (s.storageMwh < s.storageMaxMwh * 0.05 && s.dni < 100) this.setAlarm('storage', 'warn', 'al.storageLow'); else this.clearAlarm('storage');
    return out;
  }

  stepWind(dt) {
    const s = this.state, env = this.env;
    // Ornstein–Uhlenbeck turbulence around the set wind speed
    s.windHub += ((env.windMs - s.windHub) * dt / 300) + gauss(this.rng) * 0.6 * Math.sqrt(dt / 60);
    s.windHub = clamp(s.windHub, 0, 40);
    const v = s.windHub, rated = 12, cutIn = 3, cutOut = 25;
    let per;
    if (v < cutIn) per = 0;
    else if (v < rated) per = this.unitMw * Math.pow((v - cutIn) / (rated - cutIn), 3) * 1.0;
    else if (v < cutOut) per = this.unitMw;
    else per = 0;
    if (v >= cutOut) { this.setAlarm('cutout', 'warn', 'al.cutOut', { v: v.toFixed(1) }); this._cutout = true; }
    if (this._cutout && v < 20) { this._cutout = false; this.clearAlarm('cutout'); }
    if (this._cutout) per = 0;
    let total = 0;
    for (const u of this.units) { u.output = u.state === 'on' ? per * clamp(this.controls.setpoint, 0, 1) : 0; total += u.output; }
    s.rotorRpm = per > 0 ? clamp(6 + 9 * Math.min(1, v / rated), 0, 16) : 0;
    s.efficiency = v > 0 ? clamp(per * 1e6 / (0.5 * 1.225 * Math.PI * (this.rotorD / 2) ** 2 * v ** 3 + 1), 0, 0.59) : 0;
    return total;
  }

  stepHydro(dt) {
    const s = this.state, env = this.env, cap = this.plant.capacityMw, dam = this.techCode === 'hydro_dam';
    const eta = 0.9;
    s.headM = (dam ? (this.plant.id === 'gppd-WRI1019990' ? 74 : 60) : 8) * (0.7 + 0.3 * s.reservoirLevel);
    const qMaxPlant = cap * 1e6 / (1000 * 9.81 * s.headM * eta);
    const on = this.units.filter(u => u.state === 'on').length / this.units.length;
    const q = qMaxPlant * clamp(this.controls.gateFrac, 0, 1) * on;
    s.flowM3s = q;
    const out = Math.min(cap, 1000 * 9.81 * q * s.headM * eta / 1e6);
    const volume = qMaxPlant * (dam ? 45 : 0.5) * 86400; // m³ of usable storage
    const inflow = qMaxPlant * env.flowFrac;
    s.reservoirLevel = clamp(s.reservoirLevel + (inflow - q) * dt / volume, 0, 1);
    if (s.reservoirLevel >= 0.999 && inflow > q) this.setAlarm('spill', 'info', 'al.spilling'); else this.clearAlarm('spill');
    if (s.reservoirLevel < 0.15) this.setAlarm('lowlevel', 'warn', 'al.lowReservoir'); else this.clearAlarm('lowlevel');
    for (const u of this.units) u.output = u.state === 'on' ? out / Math.max(1, this.units.filter(x => x.state === 'on').length) : 0;
    s.efficiency = eta;
    return out;
  }

  kpis() {
    const hours = this.kpi.elapsedSec / 3600;
    return {
      energyMwh: this.kpi.energyMwh, co2Tonnes: this.kpi.co2Tonnes, fuelTonnes: this.kpi.fuelTonnes, trips: this.kpi.trips,
      capacityFactor: hours > 0 ? this.kpi.energyMwh / (this.plant.capacityMw * hours) : 0,
      availability: this.kpi.elapsedSec > 0 ? 1 - this.kpi.unavailableSec / this.kpi.elapsedSec : 1,
      hours,
    };
  }
}
