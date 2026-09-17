#!/usr/bin/env node
/**
 * Builds data/arab-map.json (offline base map) from a Natural Earth "admin 0 countries" GeoJSON.
 * Usage: node scripts/build-map.mjs /path/to/ne_50m_admin_0_countries.geojson
 * Natural Earth data is public domain (https://www.naturalearthdata.com/about/terms-of-use/).
 */
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: build-map.mjs <ne_admin_0_countries.geojson>'); process.exit(1); }
const ARAB = ['DZA','BHR','COM','DJI','EGY','IRQ','JOR','KWT','LBN','LBY','MRT','MAR','OMN','PSE','QAT','SAU','SOM','SDN','SYR','TUN','ARE','YEM'];
// Neighbours drawn for geographic context only.
const CONTEXT = ['TUR','IRN','ISR','ETH','ERI','TCD','NER','MLI','SEN','ESP','ITA','GRC','CYP','SSD','KEN','CAF','NGA','CMR','PRT','MLT','AFG','TKM','ARM','AZE','GEO','BGR','ALB','MKD','UGA','GMB','GNB','GIN','BFA','FRA','PAK','UZB','MDG','MOZ','TZA','COD','SLE','LBR','CIV','GHA','TGO','BEN','GAB','COG','RWA','BDI','SRB','BIH','HRV','MNE','ROU','UKR','RUS','KAZ','IND','SWZ','ZMB','MWI','ZWE','AGO'];
// Only geometry inside this window is kept (lon/lat) so the file stays small.
const BBOX = { minLon: -25, maxLon: 70, minLat: -12, maxLat: 48 };
const MERGE = { SOL: 'SOM', SAH: 'MAR', PSX: 'PSE' }; // NE splits these; merge into the Arab League member they belong to in the app

const geo = JSON.parse(fs.readFileSync(src, 'utf8'));
const out = { type: 'FeatureCollection', attribution: 'Natural Earth (public domain), 1:50m admin-0 countries, simplified to 2 decimals', features: [] };
const byIso = new Map();
for (const f of geo.features) {
  const p = f.properties;
  let iso = p.ADM0_A3 || p.ISO_A3;
  if (MERGE[iso]) iso = MERGE[iso];
  if (iso === '-99') iso = p.ISO_A3;
  const isArab = ARAB.includes(iso);
  if (!isArab && !CONTEXT.includes(iso)) continue;
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const simplified = [];
  for (const poly of polys) {
    const rings = [];
    if (!isArab) {
      let inside = false;
      for (const [x, y] of poly[0]) { if (x >= BBOX.minLon && x <= BBOX.maxLon && y >= BBOX.minLat && y <= BBOX.maxLat) { inside = true; break; } }
      if (!inside) continue;
    }
    for (const ring of poly) {
      const pts = [];
      let last = null;
      for (const [x, y] of ring) {
        const prec = isArab ? 100 : 20;
        const px = Math.round(x * prec) / prec, py = Math.round(y * prec) / prec;
        if (last && last[0] === px && last[1] === py) continue;
        pts.push([px, py]); last = [px, py];
      }
      if (pts.length >= 4) rings.push(pts);
    }
    if (rings.length) simplified.push(rings);
  }
  if (!byIso.has(iso)) byIso.set(iso, { iso, name: p.NAME_LONG || p.NAME, arab: isArab, polys: [] });
  byIso.get(iso).polys.push(...simplified);
}
for (const c of byIso.values()) {
  out.features.push({ type: 'Feature', properties: { iso: c.iso, name: c.name, arab: c.arab }, geometry: { type: 'MultiPolygon', coordinates: c.polys } });
}
out.features.sort((a, b) => (a.properties.arab === b.properties.arab ? a.properties.iso.localeCompare(b.properties.iso) : a.properties.arab ? 1 : -1));
const dest = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'arab-map.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${dest}: ${out.features.length} countries, ${(fs.statSync(dest).size / 1024).toFixed(0)} KB; arab=${out.features.filter(f => f.properties.arab).length}`);
