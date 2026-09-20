#!/usr/bin/env node
/**
 * Builds the PDF user manuals (Arabic + English) from tools/manual/content-*.cjs and the screenshots taken by capture.cjs.
 *
 *   node tools/manual/capture.cjs .tmp/manual-shots
 *   node tools/manual/build.cjs [shotsDir=.tmp/manual-shots] [outDir=docs/manual]
 *
 * Rendering: Chromium (Playwright) prints an HTML document with the app's Cairo font embedded; figures are the JPEG screenshots.
 */
const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.resolve(process.argv[2] || path.join(ROOT, '.tmp', 'manual-shots'));
const OUT = path.resolve(process.argv[3] || path.join(ROOT, 'docs', 'manual'));
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const fontB64 = fs.readFileSync(path.join(ROOT, 'src/renderer/assets/fonts/Cairo-Variable.ttf')).toString('base64');
const logoApp = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'src/renderer/assets/logo.png')).toString('base64');
const logoAsfan = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'src/renderer/assets/asfan-logo.png')).toString('base64');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');

function figure(lang, name, caption, num) {
  const dir = path.join(SHOTS, lang); const file = fs.existsSync(dir) ? fs.readdirSync(dir).find(f => f.endsWith(`-${name}.jpg`)) : null;
  if (!file) return `<div class="fig missing">[${esc(name)}]</div>`;
  const src = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
  return `<figure class="fig"><img src="${src}" alt=""><figcaption>${lang === 'ar' ? 'شكل' : 'Figure'} ${num}: ${inline(caption)}</figcaption></figure>`;
}
function renderBlocks(lang, blocks, counter) {
  return blocks.map(b => {
    if (typeof b === 'string') return `<p>${inline(b)}</p>`;
    if (b.p) return `<p>${inline(b.p)}</p>`;
    if (b.h) return `<h4>${inline(b.h)}</h4>`;
    if (b.steps) return `<ol class="steps">${b.steps.map(s => `<li>${inline(s)}</li>`).join('')}</ol>`;
    if (b.ul) return `<ul>${b.ul.map(s => `<li>${inline(s)}</li>`).join('')}</ul>`;
    if (b.tip) return `<div class="box tip">${inline(b.tip)}</div>`;
    if (b.warn) return `<div class="box warn">${inline(b.warn)}</div>`;
    if (b.table) return `<table>${b.head ? `<thead><tr>${b.head.map(x => `<th>${inline(x)}</th>`).join('')}</tr></thead>` : ''}<tbody>${b.table.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    if (b.fig) { counter.n++; return figure(lang, b.fig, b.caption || '', counter.n); }
    if (b.pre) return `<pre>${esc(b.pre)}</pre>`;
    return '';
  }).join('\n');
}
function buildHtml(lang, doc) {
  const rtl = lang === 'ar'; const counter = { n: 0 }; let chapterNo = 0;
  const toc = doc.chapters.map(ch => { chapterNo++; return `<li><a href="#ch${chapterNo}">${chapterNo}. ${inline(ch.title)}</a>${ch.sections && ch.sections.length > 1 ? `<ul>${ch.sections.map((s, i) => `<li><a href="#ch${chapterNo}-${i + 1}">${chapterNo}.${i + 1} ${inline(s.title)}</a></li>`).join('')}</ul>` : ''}</li>`; }).join('');
  chapterNo = 0;
  const body = doc.chapters.map(ch => {
    chapterNo++;
    return `<section class="chapter" id="ch${chapterNo}"><h2><span class="num">${chapterNo}</span>${inline(ch.title)}</h2>${ch.intro ? renderBlocks(lang, ch.intro, counter) : ''}${(ch.sections || []).map((s, i) => `<div class="sec" id="ch${chapterNo}-${i + 1}"><h3>${chapterNo}.${i + 1} ${inline(s.title)}</h3>${renderBlocks(lang, s.body, counter)}</div>`).join('')}</section>`;
  }).join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
@font-face { font-family: 'Cairo'; src: url(data:font/ttf;base64,${fontB64}) format('truetype'); font-weight: 200 900; }
@page { size: A4; margin: 18mm 14mm 20mm 14mm; }
* { box-sizing: border-box; } html, body { margin: 0; }
body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #1f2a33; font-size: 11.2pt; line-height: 1.65; }
h1 { font-size: 26pt; margin: 0 0 6pt; color: #0f5f6e; } h2 { font-size: 19pt; color: #0f5f6e; margin: 0 0 10pt; padding-bottom: 6pt; border-bottom: 2px solid #22b8cf; page-break-after: avoid; }
h2 .num { display: inline-block; background: #22b8cf; color: #fff; border-radius: 8px; padding: 0 10px; margin-inline-end: 10px; font-size: 15pt; }
h3 { font-size: 14pt; color: #17414c; margin: 16pt 0 6pt; page-break-after: avoid; } h4 { font-size: 12pt; margin: 12pt 0 4pt; color: #17414c; }
p { margin: 0 0 8pt; text-align: justify; } ul, ol { margin: 0 0 8pt; padding-inline-start: 22pt; } li { margin-bottom: 3pt; }
ol.steps > li { padding-inline-start: 4pt; } ol.steps > li::marker { color: #0f8fa5; font-weight: 700; }
code { font-family: Consolas, 'DejaVu Sans Mono', monospace; font-size: 9.5pt; background: #f0f4f7; padding: 1px 5px; border-radius: 4px; direction: ltr; unicode-bidi: isolate; }
pre { background: #f0f4f7; border: 1px solid #d9e1e8; border-radius: 6px; padding: 8pt 10pt; font-family: Consolas, 'DejaVu Sans Mono', monospace; font-size: 9pt; direction: ltr; text-align: left; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 10pt; page-break-inside: auto; } th, td { border: 1px solid #cfd8e0; padding: 5pt 7pt; text-align: start; vertical-align: top; } th { background: #e8f3f6; color: #0f5f6e; } tr { page-break-inside: avoid; }
.box { border-radius: 8px; padding: 8pt 12pt; margin: 8pt 0 10pt; border: 1px solid; page-break-inside: avoid; } .box.tip { background: #eaf7f9; border-color: #8fd3df; } .box.warn { background: #fff5e6; border-color: #f2c078; }
.box.tip::before { content: '${rtl ? 'نصيحة: ' : 'Tip: '}'; font-weight: 800; color: #0f8fa5; } .box.warn::before { content: '${rtl ? 'تنبيه: ' : 'Note: '}'; font-weight: 800; color: #b66a00; }
figure.fig { margin: 8pt 0 12pt; page-break-inside: avoid; text-align: center; } figure.fig img { width: 100%; border: 1px solid #cfd8e0; border-radius: 6px; } figcaption { font-size: 9.5pt; color: #4d5c69; margin-top: 4pt; }
.fig.missing { color: #999; font-size: 9pt; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; }
.cover img.app { width: 120px; } .cover .title { font-size: 30pt; font-weight: 800; color: #0f5f6e; margin: 18pt 0 4pt; } .cover .sub { font-size: 16pt; color: #17414c; margin-bottom: 26pt; }
.cover .meta { color: #4d5c69; font-size: 11pt; margin-top: 30pt; } .cover img.asfan { height: 60px; margin-top: 40pt; } .cover .contact { font-size: 10.5pt; color: #4d5c69; direction: ltr; }
.toc { page-break-after: always; } .toc ul { list-style: none; padding-inline-start: 0; } .toc > ul > li { margin: 4pt 0; font-weight: 700; } .toc ul ul { padding-inline-start: 18pt; font-weight: 400; } .toc a { color: #17414c; text-decoration: none; }
section.chapter { page-break-before: always; } section.chapter:first-of-type { page-break-before: auto; }
.kv td:first-child { width: 34%; font-weight: 700; background: #f7fafb; }
</style></head><body>
<div class="cover"><img class="app" src="${logoApp}"><div class="title">${esc(doc.title)}</div><div class="sub">${esc(doc.subtitle)}</div><div class="meta">${esc(doc.versionLabel)} ${esc(pkg.version)} · ${date}</div><img class="asfan" src="${logoAsfan}"><div class="contact">${esc(doc.company)} · info@asfanco.com · WhatsApp +962 77 614 0404</div></div>
<div class="toc"><h2>${esc(doc.tocTitle)}</h2><ul>${toc}</ul></div>
${body}
</body></html>`;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const lang of ['ar', 'en']) {
    const doc = require(path.join(__dirname, `content-${lang}.cjs`));
    const html = buildHtml(lang, doc);
    const tmp = path.join(ROOT, '.tmp', `manual-${lang}.html`); fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.writeFileSync(tmp, html);
    const page = await browser.newPage();
    await page.goto('file://' + tmp, { waitUntil: 'load' }); await page.waitForTimeout(500);
    const file = path.join(OUT, `ArabPowerTwin-UserManual-${lang.toUpperCase()}.pdf`);
    const foot = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#6b7885;width:100%;padding:0 14mm;display:flex;justify-content:space-between;direction:ltr"><span>Arab Power Twin · ${lang === 'ar' ? 'User Manual (Arabic)' : 'User Manual'} · v${pkg.version}</span><span>Asfan Co. · info@asfanco.com · WhatsApp +962 77 614 0404</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    await page.pdf({ path: file, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot, margin: { top: '18mm', bottom: '20mm', left: '14mm', right: '14mm' } });
    const size = fs.statSync(file).size; console.log(lang, '->', file, (size / 1024 / 1024).toFixed(1) + ' MB');
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('BUILD FAILED:', e); process.exit(1); });
