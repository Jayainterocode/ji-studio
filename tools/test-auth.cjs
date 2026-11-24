// Uji alur akun ujung-ke-ujung: setup admin, undang pengguna, aktivasi lewat email, masuk, lupa password,
// batas percobaan, dan pemeriksaan keamanan API. Butuh server HTTPS + PHP dan SMTP uji.
// Pakai: BASE=https://localhost:8443/ MAILDIR=<folder .eml> SETUP_KEY=... node tools/test-auth.cjs <shotdir>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const B = process.env.BASE, MD = process.env.MAILDIR, KEY = process.env.SETUP_KEY, SHOT = process.argv[2];
const ok = (c, m) => { console.log((c ? 'LULUS ' : 'GAGAL ') + m); if (!c) process.exitCode = 1; };
const lastLink = async () => {
  for (let i = 0; i < 50; i++) {
    const f = fs.readdirSync(MD).sort().pop();
    if (f) { const raw = fs.readFileSync(MD + '/' + f, 'utf8'); fs.unlinkSync(MD + '/' + f);
      const body = Buffer.from(raw.split(/\r?\n\r?\n/).slice(1).join('').replace(/\s/g, ''), 'base64').toString();
      return body.match(/https:\S+reset\.html#t=[\w-]+/)[0]; }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('email tidak masuk');
};
(async () => {
  const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, ...devices['Pixel 7'] });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/(401|403|429)/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push(e.message));

  await p.goto(B); await p.waitForURL(/setup\.html/); ok(true, 'belum ada pengguna -> diarahkan ke setup');
  await p.fill('#sKey', 'salah-kunci-0000000000'); await p.fill('#sUser', 'admin'); await p.fill('#sEmail', 'admin@example.com'); await p.fill('#sPass', 'rahasia-admin-1');
  await p.click('#bSetup'); await p.waitForSelector('#sMsg.err'); ok(/salah/i.test(await p.textContent('#sMsg')), 'kunci setup salah ditolak');
  await p.fill('#sKey', KEY); await p.fill('#sName', 'Andi Admin'); await p.click('#bSetup');
  await p.waitForSelector('body.ready #hello'); ok((await p.textContent('#hello')) === 'Halo, Andi', 'admin dibuat & masuk ke beranda');
  ok(await p.isVisible('#adminBox'), 'admin melihat menu Kelola pengguna');
  await p.screenshot({ path: SHOT + '/a-beranda-admin.png' });

  await p.goto(B + 'm/users/'); await p.waitForSelector('body.ready');
  await p.fill('#aName', 'Budi Sopir'); await p.fill('#aUser', 'budi'); await p.fill('#aEmail', 'budi@example.com'); await p.click('#bAdd');
  await p.waitForSelector('#aMsg.ok'); ok(true, 'undangan: ' + await p.textContent('#aMsg'));
  await p.waitForSelector('text=BELUM AKTIVASI');
  await p.screenshot({ path: SHOT + '/b-pengguna.png', fullPage: true });
  const invite = await lastLink();

  await p.click('#who button'); await p.waitForURL(/login\.html/); ok(true, 'admin keluar');
  await p.screenshot({ path: SHOT + '/c-login.png' });

  await p.goto(invite); await p.fill('#rPass', 'budi-pass-123'); await p.fill('#rPass2', 'budi-pass-123'); await p.click('#bReset');
  await p.waitForURL(/login\.html\?reset=1/); ok(!(await p.url()).includes('#t='), 'aktivasi undangan berhasil, token hilang dari alamat');
  const again = await ctx.request.post(B + 'api/reset.php', { headers: { 'X-JI': '1', 'Content-Type': 'application/json', Origin: B.slice(0, -1) }, data: { token: invite.split('#t=')[1], password: 'coba-lagi-123' } });
  ok(again.status() === 400, 'tautan undangan tidak bisa dipakai dua kali');

  await p.fill('#lUser', 'budi'); await p.fill('#lPass', 'budi-pass-123'); await p.click('#bLogin');
  await p.waitForSelector('body.ready #hello'); ok((await p.textContent('#hello')) === 'Halo, Budi' && !(await p.isVisible('#adminBox')), 'staf masuk, tanpa menu admin');
  const st = await p.evaluate(async () => (await fetch('api/users.php', { headers: { 'X-JI': '1' } })).status);
  ok(st === 403, 'staf tidak bisa membuka API pengguna');
  await p.goto(B + 'm/users/'); await p.waitForURL(u => !u.href.includes('/m/users/')); ok(true, 'staf dialihkan dari halaman admin');
  await p.goto(B + 'm/story/'); await p.waitForSelector('body.ready'); ok(true, 'staf membuka Story Pengantaran');
  await p.screenshot({ path: SHOT + '/d-story.png' });
  await p.click('#who button'); await p.waitForURL(/login\.html/);

  await p.click('#toForgot'); await p.fill('#fLogin2', 'budi@example.com'); await p.click('#bForgot'); await p.waitForSelector('#fMsg.ok');
  await p.screenshot({ path: SHOT + '/e-lupa.png' });
  const reset = await lastLink(); ok(true, 'email reset masuk');
  const nf = await ctx.request.post(B + 'api/forgot.php', { headers: { 'X-JI': '1', 'Content-Type': 'application/json' }, data: { login: 'tidak-ada' } });
  ok((await nf.json()).message === (await p.textContent('#fMsg')), 'jawaban lupa password sama untuk akun yang tidak ada');
  await p.goto(reset); await p.fill('#rPass', 'pass-baru-456'); await p.fill('#rPass2', 'pass-baru-456'); await p.click('#bReset'); await p.waitForURL(/reset=1/);
  await p.fill('#lUser', 'budi'); await p.fill('#lPass', 'budi-pass-123'); await p.click('#bLogin'); await p.waitForSelector('#lMsg.err');
  ok(/salah/.test(await p.textContent('#lMsg')), 'password lama ditolak');
  await p.fill('#lPass', 'pass-baru-456'); await p.click('#bLogin'); await p.waitForSelector('body.ready #hello'); ok(true, 'masuk dengan password baru');
  const ck = (await ctx.cookies()).find(c => c.name === '__Host-ji');
  ok(ck && ck.httpOnly && ck.secure && ck.sameSite === 'Strict', 'cookie sesi HttpOnly + Secure + SameSite=Strict');

  const post = (path, data, h = {}) => ctx.request.post(B + 'api/' + path, { headers: { 'Content-Type': 'application/json', ...h }, data });
  ok((await post('login.php', { username: 'x', password: 'y' })).status() === 403, 'tanpa header X-JI ditolak');
  ok((await post('login.php', { username: 'x', password: 'y' }, { 'X-JI': '1', Origin: 'https://jahat.example' })).status() === 403, 'origin lain ditolak');
  let last = 0; for (let i = 0; i < 6; i++) last = (await post('login.php', { username: 'admin', password: 'salah' + i }, { 'X-JI': '1' })).status();
  ok(last === 429, 'tebak password dibatasi (429 setelah 5 kali)');
  for (const u of ['api/lib/boot.php', 'api/lib/mail.php', '.htaccess', 'api/', '../ji-config.php'])
    ok([403, 404].includes((await ctx.request.get(B + u)).status()), 'tertutup: ' + u);
  ok(errs.length === 0, 'console bersih' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
})();
