// Sales brochures (A4, 3 pages, AR + EN). Images: node tools/brochure/hero.cjs <plantIds> renders 3D twins into tools/brochure/shots; graded copies live in img/.
// Build: node tools/brochure/build.cjs  ->  docs/brochure/ArabPowerTwin-Brochure-{EN,AR}.pdf
const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const ROOT = '/home/user/power-plant-for-the-arab-world';
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const C = require('./content.cjs');
const b64 = (f, mime) => `data:${mime};base64,` + fs.readFileSync(f).toString('base64');
const IMG = n => b64(path.join(__dirname, 'img', n), 'image/jpeg');
const FONT = b64(path.join(ROOT, 'src/renderer/assets/fonts/Cairo-Variable.ttf'), 'font/ttf');
const LOGO = b64(path.join(ROOT, 'src/renderer/assets/asfan-logo.png'), 'image/png');
const LOGO_W = b64(path.join(ROOT, 'src/renderer/assets/asfan-logo-dark.png'), 'image/png');
const APP = b64(path.join(ROOT, 'src/renderer/assets/logo.png'), 'image/png');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/\{\{(.+?)\}\}/g, '<bdi dir="ltr">$1</bdi>');
const ICON = {
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  cube: '<path d="M12 2.5 3.5 7.2v9.6l8.5 4.7 8.5-4.7V7.2L12 2.5z"/><path d="m3.5 7.2 8.5 4.7 8.5-4.7M12 11.9v9.6"/>',
  bolt: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5l1-8z"/>',
  check: '<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="m8.5 12.2 2.6 2.6 4.4-5.3"/>',
  chart: '<path d="M5 20V11M11 20V5M17 20v-6M3 20.5h18"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.5 3.3-5.4 6.2-5.4s5.4 1.9 6.2 5.4"/><path d="M15.8 4.8a3.4 3.4 0 0 1 0 6.4M17.8 14.9c1.8.7 3 2.4 3.4 5.1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  wa: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.6-4.5a8.5 8.5 0 1 1 15.4-4.4z"/><path d="M9 9.3c.3 1.6 1.6 3.2 3.6 4l1.2-1.1 1.9.7-.2 1.6c-3.3.5-7.1-3.2-6.9-6.6l1.6-.2.6 1.9z"/>',
};
const svg = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const RENDERS = {
  en: [['hero-gppd-WRI1000087.jpg', 'Onshore wind', 'Zafarana Wind Farm, Egypt'], ['hero-gppd-WRI1000106.jpg', 'Hydroelectric dam', 'Aswan High Dam, Egypt'], ['hero-gppd-WRI1008738.jpg', 'Combined cycle', 'Jebel Ali M Station, UAE']],
  ar: [['hero-gppd-WRI1000087.jpg', 'رياح برية', 'مزرعة رياح الزعفرانة، مصر'], ['hero-gppd-WRI1000106.jpg', 'سد كهرومائي', 'السد العالي بأسوان، مصر'], ['hero-gppd-WRI1008738.jpg', 'دورة مركبة', 'محطة جبل علي M، الإمارات']],
};
const RENDER_TITLE = { en: 'Every technology on its real site', ar: 'كل تقنية في موقعها الحقيقي' };

function html(L) {
  const c = C[L]; const ar = L === 'ar';
  const n = s => `<bdi dir="ltr">${esc(s)}</bdi>`;
  return `<!DOCTYPE html><html lang="${c.lang}" dir="${c.dir}"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Cairo'; src: url(${FONT}) format('truetype'); font-weight: 200 1000; }
@page { size: A4; margin: 0; }
:root { --ink:#1d2333; --ink2:#454c5e; --muted:#7c8293; --paper:#f7f5f0; --card:#ffffff; --line:#e3ded3; --v1:#5b63f2; --v2:#8b5cf6; --v3:#cf4ee6; --navy:#1b2030; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--paper); }
body { font-family: 'Cairo', sans-serif; color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10pt; line-height: 1.55; }
.page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; background: var(--paper); }
.page:last-child { page-break-after: auto; }
.pad { padding: 17mm 18mm 0; }
.eyebrow { font-size: 8.6pt; font-weight: 700; color: var(--v2); ${ar ? '' : 'letter-spacing: .14em; text-transform: uppercase;'} }
.rule { width: 26mm; height: 1.1mm; border-radius: 1mm; background: linear-gradient(${ar ? '270deg' : '90deg'}, var(--v1), var(--v2) 55%, var(--v3)); }
h1 { font-weight: 800; color: var(--ink); line-height: ${ar ? 1.32 : 1.04}; font-size: ${ar ? 29 : 46}pt; letter-spacing: ${ar ? 0 : '-.01em'}; }
h2 { font-weight: 800; font-size: ${ar ? 21 : 23}pt; line-height: 1.25; margin: 2mm 0 0; letter-spacing: ${ar ? 0 : '-.005em'}; }
.lead { font-size: 10.4pt; color: var(--ink2); line-height: 1.7; }
/* ---- cover ---- */
.brandbar { display: flex; align-items: center; justify-content: space-between; }
.brandbar .asfan { height: 10.5mm; }
.appmark { display: flex; align-items: center; gap: 2.4mm; font-weight: 700; font-size: 9pt; color: var(--ink2); }
.appmark img { height: 8.5mm; }
.intro { margin-top: ${ar ? 15 : 18}mm; }
.intro .eyebrow { margin-bottom: 3.2mm; }
.intro .latin { font-size: 12pt; font-weight: 700; color: var(--muted); margin-top: 1.5mm; direction: ltr; text-align: ${ar ? 'right' : 'left'}; }
.intro .rule { margin: 6mm 0 5mm; }
.intro .sub { font-size: 14pt; font-weight: 600; color: var(--ink); line-height: 1.45; max-width: 160mm; }
.intro .lead { margin-top: 3mm; max-width: 158mm; }
.hero { position: absolute; left: 0; right: 0; top: 133mm; height: 113mm; }
.hero img { width: 100%; height: 100%; object-fit: cover; object-position: 30% 55%; display: block; }
.hero::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 16mm; background: linear-gradient(var(--paper), rgba(247,245,240,0)); z-index: 1; }
.hero .cap { position: absolute; bottom: 4.5mm; ${ar ? 'right' : 'left'}: 18mm; z-index: 2; background: rgba(27,32,48,.72); color: #fff; font-size: 7.6pt; padding: 1.2mm 3.2mm; border-radius: 10mm; }
.stats { position: absolute; left: 0; right: 0; bottom: 0; height: 51mm; background: var(--navy); color: #fff; display: grid; grid-template-columns: repeat(4, 1fr); padding: 0 18mm; align-items: center; }
.stat { padding: 0 3mm; border-${ar ? 'right' : 'left'}: 1px solid rgba(255,255,255,.14); }
.stat:first-child { border: 0; padding-${ar ? 'right' : 'left'}: 0; }
.stat .num { font-size: 27pt; font-weight: 800; line-height: 1.1; color: #b9b2ff; }
.stat .lbl { font-size: 8.6pt; color: rgba(255,255,255,.78); margin-top: 1.2mm; line-height: 1.4; }
/* ---- page 2 ---- */
.p2 .lead { margin-top: 4mm; max-width: 170mm; }
.flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; margin-top: 9mm; position: relative; }
.flow::before { content: ''; position: absolute; top: 4.2mm; left: 6mm; right: 6mm; height: 0; border-top: 1px dashed #c9c2e9; }
.step .dot { width: 8.4mm; height: 8.4mm; border-radius: 50%; background: var(--paper); border: 1.3px solid var(--v2); color: var(--v2); font-weight: 800; font-size: 9.5pt; display: flex; align-items: center; justify-content: center; position: relative; }
.step:last-child .dot { background: var(--v2); color: #fff; }
.step h4 { font-size: 10.6pt; font-weight: 800; margin: 3mm 0 1mm; }
.step p { font-size: 8.5pt; color: var(--ink2); line-height: 1.55; }
.frame { margin-top: 9mm; border-radius: 3mm; overflow: hidden; border: 1px solid #d9d4c8; box-shadow: 0 6mm 14mm -6mm rgba(29,35,51,.28), 0 1mm 3mm rgba(29,35,51,.06); background: #fff; }
.frame img { display: block; width: 100%; }
.figcap { font-size: 8pt; color: var(--muted); margin-top: 3mm; }
.cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 10mm; margin-top: 8mm; }
.cols h4 { font-size: 11pt; font-weight: 800; margin-bottom: 2.5mm; }
.ticks { list-style: none; }
.ticks li { font-size: 9.2pt; color: var(--ink2); padding-${ar ? 'right' : 'left'}: 5.5mm; position: relative; margin-bottom: 1.6mm; line-height: 1.5; }
.ticks li::before { content: ''; position: absolute; ${ar ? 'right' : 'left'}: 0; top: 2.1mm; width: 2mm; height: 2mm; border-radius: .5mm; background: linear-gradient(135deg, var(--v1), var(--v3)); }
.chips { display: flex; flex-wrap: wrap; gap: 2mm; }
.chip { font-size: 8.8pt; font-weight: 600; color: var(--ink); background: var(--card); border: 1px solid var(--line); border-radius: 10mm; padding: 1.3mm 3.6mm; }
.chips + p { font-size: 8.5pt; color: var(--muted); margin-top: 3mm; line-height: 1.55; }
/* ---- page 3 ---- */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4.5mm; margin-top: 8mm; }
.feat { background: var(--card); border: 1px solid var(--line); border-radius: 3mm; padding: 5mm 5mm 4.5mm; min-height: 37mm; }
.feat .ico { width: 7.2mm; height: 7.2mm; color: var(--v2); }
.feat h4 { font-size: 10.6pt; font-weight: 800; margin: 2.4mm 0 1mm; }
.feat p { font-size: 8.4pt; color: var(--ink2); line-height: 1.55; }
.sect { display: flex; align-items: baseline; gap: 4mm; margin-top: 9mm; }
.sect h4 { font-size: 11pt; font-weight: 800; white-space: nowrap; }
.sect .line { flex: 1; border-top: 1px solid var(--line); }
.renders { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4.5mm; margin-top: 4mm; }
.renders figure img { width: 100%; height: 31mm; object-fit: cover; border-radius: 2.5mm; display: block; }
.renders figcaption { margin-top: 1.8mm; font-size: 8.4pt; line-height: 1.35; }
.renders figcaption b { display: block; font-weight: 800; color: var(--ink); }
.renders figcaption span { color: var(--muted); }
.who { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4.5mm; margin-top: 4mm; }
.who div { border-${ar ? 'right' : 'left'}: 2px solid var(--v2); padding-${ar ? 'right' : 'left'}: 3.5mm; }
.who b { display: block; font-size: 10pt; font-weight: 800; }
.who span { font-size: 8.5pt; color: var(--ink2); line-height: 1.5; display: block; margin-top: .5mm; }
.contact { position: absolute; left: 0; right: 0; bottom: 0; height: 60mm; background: var(--navy); color: #fff; padding: 11mm 18mm 0; }
.contact .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; }
.contact .logo { height: 11mm; display: block; }
.contact .by { font-size: 8.6pt; color: rgba(255,255,255,.65); margin-top: 2.5mm; }
.contact h3 { font-size: 15pt; font-weight: 800; }
.contact .lines { margin-top: 3mm; display: grid; gap: 2mm; }
.contact .lines a { color: #fff; text-decoration: none; font-size: 10.5pt; display: flex; align-items: center; gap: 2.6mm; direction: ltr; justify-content: ${ar ? 'flex-end' : 'flex-start'}; }
.contact .lines .ico { width: 5mm; height: 5mm; color: #b7a6ff; }
.facts { display: flex; gap: 2.4mm; flex-wrap: wrap; margin-top: 9mm; padding-top: 5.5mm; border-top: 1px solid rgba(255,255,255,.14); }
.facts span { font-size: 8.4pt; color: rgba(255,255,255,.86); border: 1px solid rgba(255,255,255,.22); border-radius: 10mm; padding: 1mm 3.4mm; }
</style></head><body>

<section class="page cover">
  <div class="pad">
    <div class="brandbar"><img class="asfan" src="${LOGO}" alt="ASFAN"><div class="appmark"><img src="${APP}" alt="">Arab Power Twin</div></div>
    <div class="intro">
      <div class="eyebrow">${esc(c.eyebrow)}</div>
      <h1>${c.titleBreak ? esc(c.title).replace(c.titleBreak + ' ', c.titleBreak + '<br>') : esc(c.title)}</h1>
      ${c.latinName ? `<div class="latin">${esc(c.latinName)}</div>` : ''}
      <div class="rule"></div>
      <div class="sub">${esc(c.subtitle)}</div>
      <p class="lead">${esc(c.lead).replace('620', '<bdi>620</bdi>').replace(/\b22\b/, '<bdi>22</bdi>')}</p>
    </div>
  </div>
  <div class="hero"><img src="${IMG('hero-are-barakah.jpg')}" alt=""><div class="cap">${esc(c.heroCaption)}</div></div>
  <div class="stats">${c.stats.map(([a, b]) => `<div class="stat"><div class="num">${n(a)}</div><div class="lbl">${esc(b)}</div></div>`).join('')}</div>
</section>

<section class="page p2"><div class="pad">
  <div class="eyebrow">${esc(c.p2eyebrow)}</div>
  <h2>${esc(c.p2title)}</h2>
  <div class="rule" style="margin-top:4mm"></div>
  <p class="lead">${esc(c.p2lead)}</p>
  <div class="flow">${c.flow.map(([t, d], i) => `<div class="step"><div class="dot">${i + 1}</div><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join('')}</div>
  <div class="frame"><img src="${IMG(`twin-${L}.jpg`)}" alt=""></div>
  <div class="figcap">${esc(c.shotCaption)}</div>
  <div class="cols">
    <div><h4>${esc(c.doTitle)}</h4><ul class="ticks">${c.doList.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><h4>${esc(c.scTitle)}</h4><div class="chips">${c.scenarios.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
      <p>${ar ? 'كل سيناريو يغيّر ظروف التشغيل فوراً، فيرى الطالب أثره على القدرة والتردد والكفاءة، ويُسجَّل في تقرير الجلسة.' : 'Each scenario changes operating conditions instantly; students see the effect on output, frequency and efficiency, and it is logged in the session report.'}</p></div>
  </div>
</div></section>

<section class="page p3"><div class="pad">
  <div class="eyebrow">${esc(c.p3eyebrow)}</div>
  <h2>${esc(c.p3title)}</h2>
  <div class="rule" style="margin-top:4mm"></div>
  <div class="grid">${c.features.map(([k, t, d]) => `<div class="feat">${svg(k)}<h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join('')}</div>
  <div class="sect"><h4>${esc(RENDER_TITLE[L])}</h4><div class="line"></div></div>
  <div class="renders">${RENDERS[L].map(([f, t, s]) => `<figure><img src="${IMG(f)}" alt=""><figcaption><b>${esc(t)}</b><span>${esc(s)}</span></figcaption></figure>`).join('')}</div>
  <div class="sect"><h4>${esc(c.forTitle)}</h4><div class="line"></div></div>
  <div class="who">${c.forList.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
</div>
  <div class="contact">
    <div class="row">
      <div><img class="logo" src="${LOGO_W}" alt="ASFAN"><div class="by">${esc(c.contactText)}</div></div>
      <div><h3>${esc(c.contactTitle)}</h3><div class="lines">
        <a href="mailto:${c.email}">${svg('mail')}${esc(c.email)}</a>
        <a href="https://wa.me/962776140404">${svg('wa')}${esc(c.phone)}</a></div></div>
    </div>
    <div class="facts">${c.facts.map(x => `<span>${esc(x)}</span>`).join('')}</div>
  </div>
</section>
</body></html>`;
}

(async () => {
  const outDir = process.argv[2] || path.join(ROOT, 'docs', 'brochure'); fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const L of ['en', 'ar']) {
    const h = html(L); 
    const page = await browser.newPage(); await page.setContent(h, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => [...document.querySelectorAll('.page')].map(p => { const r = p.getBoundingClientRect(); let m = 0; p.querySelectorAll('.pad *').forEach(e => { const b = e.getBoundingClientRect(); m = Math.max(m, b.bottom - r.top); }); return Math.round(m / 3.7795); }));
    console.log(L, 'content bottom per page (mm):', over.join(', '));
    const file = path.join(outDir, `ArabPowerTwin-Brochure-${L.toUpperCase()}.pdf`);
    await page.pdf({ path: file, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('->', file, (fs.statSync(file).size / 1e6).toFixed(1) + ' MB');
    await page.close();
  }
  await browser.close();
})();
