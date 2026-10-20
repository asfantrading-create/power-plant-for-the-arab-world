const path = require('path'); const fs = require('fs'); const { execSync } = require('child_process');
const ROOT = '/home/user/power-plant-for-the-arab-world';
const OUT = path.join(__dirname, 'shots');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const { buildMainContext } = require(path.join(ROOT, 'test/helpers-ipc.js'));
const { tmpDir } = require(path.join(ROOT, 'test/helpers.js'));
const HARNESS = path.join(ROOT, 'src/renderer/.manual-harness.html');
fs.writeFileSync(HARNESS, fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''));
const plants = (process.argv[2] || 'are-barakah').split(',');
(async () => {
  const ctx = buildMainContext(tmpDir());
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.exposeBinding('__invoke', async (_s, c, p) => (ctx.handlers[c] ? ctx.handlers[c]({}, p) : { ok: false, error: 'no_handler:' + c }));
  await page.addInitScript(() => { window.__listeners = {}; window.api = { invoke: (c, p) => window.__invoke(c, p), on: (ch, cb) => { (window.__listeners[ch] = window.__listeners[ch] || []).push(cb); return () => {}; } }; });
  await page.goto('file://' + HARNESS); await page.waitForSelector('.auth-card');
  await page.fill('.auth-card textarea', ctx.validKey); await page.click('.auth-card .btn.primary'); await page.waitForTimeout(700);
  const inputs = await page.$$('.auth-card input'); await inputs[0].fill('Uni'); await inputs[1].fill('admin'); await inputs[2].fill('Admin'); await inputs[3].fill('Admin@2026'); await inputs[4].fill('Admin@2026');
  await page.click('.auth-card button[type=submit]'); await page.waitForSelector('.shell'); await page.waitForTimeout(500);
  await page.addStyleTag({ content: '.twin .viewport{position:fixed!important;inset:0!important;z-index:9999!important;border-radius:0!important;width:100vw!important;height:100vh!important} .twin .viewport>*:not(canvas){display:none!important} .toast,.toasts{display:none!important}' });
  for (const id of plants) {
    await page.evaluate(r => { location.hash = '#' + r; }, '/twin/' + id);
    await page.waitForTimeout(16000);
    await page.screenshot({ path: path.join(OUT, `hero-${id}.png`), timeout: 180000 });
    console.log('shot', id);
  }
  await browser.close();
})();
