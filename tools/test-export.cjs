// Uji ujung-ke-ujung: muat modul Story, unggah video, ekspor, simpan hasil.
// Pakai: node tools/test-export.cjs <video> <kualitas> <out.mp4>   (server harus jalan di :8080)
const { chromium } = require('playwright');
(async () => {
  const [video, q = 'tinggi', out = 'out.mp4'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const ctx = await b.newContext({ acceptDownloads: true, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const base = process.env.BASE || 'http://localhost:8080/';
  if (process.env.LOGIN) { // LOGIN=username:password bila server memakai login
    const [u, pw] = process.env.LOGIN.split(':');
    await p.goto(base + 'login.html'); await p.fill('#lUser', u); await p.fill('#lPass', pw); await p.click('#bLogin');
    await p.waitForSelector('body.ready');
  }
  await p.goto(base + 'm/story/');
  await p.setInputFiles('#fileV', video);
  await p.waitForFunction(() => !document.getElementById('bExport').disabled, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  await p.selectOption('#sQual', q);
  const t0 = Date.now();
  await p.click('#bExport');
  await p.waitForFunction(() => !document.getElementById('bDown').hidden || document.getElementById('msg').classList.contains('err'), null, { timeout: 300000 });
  const msg = await p.textContent('#msg');
  console.log('msg:', msg, '| waktu:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (!(await p.isHidden('#bDown'))) {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bDown')]);
    await dl.saveAs(out);
  }
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r && r.active ? r.active.state : 'none'; });
  console.log('sw:', sw);
  console.log('console:', errs.length ? errs.join('\n') : 'bersih');
  await b.close();
})();
