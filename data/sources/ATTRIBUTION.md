# Data sources / مصادر البيانات

## Global Power Plant Database (WRI) — v1.3.0
- File: `gppd_v130_arab_subset.csv` — the rows of the World Resources Institute *Global Power Plant Database*
  (version 1.3.0, 2021) whose `country` is one of the 22 Arab League member states (487 plants).
- License: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Citation: Global Energy Observatory, Google, KTH Royal Institute of Technology in Stockholm, Enipedia,
  World Resources Institute. 2018. *Global Power Plant Database*. Published on Resource Watch and Google Earth Engine;
  https://datasets.wri.org/dataset/globalpowerplantdatabase
- Each row keeps its own upstream `source` / `url` (Arab Union of Electricity, ECRA, EEHC, Wiki-Solar, GEODB, AfDB, ...).

## Curated additions — `curated-plants.json`
Plants commissioned or announced after the GPPD cut-off (2019/2020) and countries missing from GPPD
(Somalia, Comoros). Compiled from public sources: operator/utility publications (DEWA, EWEC, SEC, EEHC, MASEN,
Nawah/ENEC, Kahramaa, OPWP, KAPSARC, AUPTDE), IRENA statistics and press releases. Every record carries a
`dataQuality` flag (`verified` | `approximate`) and, where relevant, a `status` (`operational`, `under_construction`,
`planned`). Coordinates of curated records are approximate site coordinates unless marked verified.

## Base map — `../arab-map.json`
Natural Earth 1:50m Admin-0 countries (public domain), simplified.

> This is an educational product. Capacities, dates and ownership change over time; the dataset is refreshed with
> application updates and can be corrected through `overrides.json` without touching upstream data.
