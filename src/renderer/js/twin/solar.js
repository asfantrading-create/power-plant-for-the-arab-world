// Solar position (NOAA simplified algorithm) and clear-sky irradiance models.
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

/** Returns { elevation (deg), azimuth (deg from north, clockwise), declination, zenith } for a UTC Date. */
export function sunPosition(date, lat, lon) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const jc = (jd - 2451545) / 36525;
  const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
  const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const C = Math.sin(M * D2R) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * jc) + Math.sin(3 * M * D2R) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * jc;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
  const eps0 = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * D2R);
  const decl = Math.asin(Math.sin(eps * D2R) * Math.sin(lambda * D2R)) * R2D;
  const y = Math.tan(eps / 2 * D2R) ** 2;
  const eqTime = 4 * R2D * (y * Math.sin(2 * L0 * D2R) - 2 * e * Math.sin(M * D2R) + 4 * e * y * Math.sin(M * D2R) * Math.cos(2 * L0 * D2R) - 0.5 * y * y * Math.sin(4 * L0 * D2R) - 1.25 * e * e * Math.sin(2 * M * D2R));
  const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = (minutesUtc + eqTime + 4 * lon + 1440) % 1440;
  let ha = trueSolarTime / 4 - 180; if (ha < -180) ha += 360;
  const cosZen = Math.sin(lat * D2R) * Math.sin(decl * D2R) + Math.cos(lat * D2R) * Math.cos(decl * D2R) * Math.cos(ha * D2R);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZen))) * R2D;
  const denom = Math.cos(lat * D2R) * Math.sin(zenith * D2R);
  let az = Math.abs(denom) < 1e-9 ? 180 : Math.acos(Math.max(-1, Math.min(1, ((Math.sin(lat * D2R) * cosZen) - Math.sin(decl * D2R)) / denom))) * R2D;
  az = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  return { elevation: 90 - zenith, azimuth: az, declination: decl, zenith };
}

/** Clear-sky global horizontal irradiance (Haurwitz) in W/m². */
export function clearSkyGhi(elevationDeg) {
  const s = Math.sin(elevationDeg * D2R);
  if (s <= 0) return 0;
  return 1098 * s * Math.exp(-0.059 / s);
}
/** Clear-sky direct normal irradiance (Meinel air-mass model) in W/m². */
export function clearSkyDni(elevationDeg) {
  const s = Math.sin(elevationDeg * D2R);
  if (s <= 0.01) return 0;
  const am = 1 / s;
  return 1361 * Math.pow(0.7, Math.pow(am, 0.678));
}
/** Cloud attenuation factor for GHI (Kasten & Czeplak) and a harsher one for DNI. */
export function cloudFactorGhi(cloud) { return 1 - 0.75 * Math.pow(Math.max(0, Math.min(1, cloud)), 3.4); }
export function cloudFactorDni(cloud) { return Math.max(0, 1 - 1.15 * Math.max(0, Math.min(1, cloud))); }
/** Approximate local timezone offset (hours) for a longitude. */
export function tzOffsetHours(lon) { return Math.round(lon / 15); }
