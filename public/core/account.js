// Halaman akun: masuk, lupa password, buat password baru (reset/undangan), setup admin pertama.
import { api, safeNext } from './auth.js';

const $ = id => document.getElementById(id);
const say = (el, text, kind) => { el.textContent = text; el.className = 'msg' + (kind ? ' ' + kind : ''); };
const busy = (btn, on) => { btn.disabled = on; btn.classList.toggle('busy', on); };
const params = new URLSearchParams(location.search);

// Tombol "Lihat" di kolom password
document.querySelectorAll('[data-toggle]').forEach(b => {
  b.setAttribute('aria-pressed', 'false');
  b.onclick = () => {
    const i = $(b.dataset.toggle), show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.textContent = show ? 'Sembunyi' : 'Lihat';
    b.setAttribute('aria-pressed', String(show));
  };
});

function submit(form, btn, msg, run) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (btn.disabled) return;
    busy(btn, true); say(msg, '');
    try { await run(); }
    catch (err) { say(msg, err.message, 'err'); }
    finally { busy(btn, false); }
  });
}

// ---------- Masuk
if ($('fLogin')) {
  const next = safeNext(params.get('next'));
  // Sudah masuk? langsung lanjut. Belum ada pengguna sama sekali? ke setup.
  api('me.php').then(() => location.replace(next)).catch(e => {
    if (e.data && e.data.needsSetup) location.replace('setup.html');
  });
  if (params.get('reset') === '1') say($('lMsg'), 'Password tersimpan. Silakan masuk dengan password baru.', 'ok');

  submit($('fLogin'), $('bLogin'), $('lMsg'), async () => {
    const username = $('lUser').value.trim(), password = $('lPass').value;
    if (!username || !password) throw new Error('Isi username dan password.');
    const r = await api('login.php', { username, password });
    try { localStorage.setItem('ji:user', JSON.stringify(r.user)); } catch {}
    location.replace(next);
  });

  const show = forgot => {
    $('fLogin').hidden = forgot; $('fForgot').hidden = !forgot;
    (forgot ? $('fLogin2') : $('lUser')).focus();
    if (forgot && !$('fLogin2').value) $('fLogin2').value = $('lUser').value.trim();
  };
  $('toForgot').onclick = () => show(true);
  $('toLogin').onclick = () => show(false);

  submit($('fForgot'), $('bForgot'), $('fMsg'), async () => {
    const login = $('fLogin2').value.trim();
    if (!login) throw new Error('Isi username atau email.');
    const r = await api('forgot.php', { login });
    say($('fMsg'), r.message, 'ok');
  });
}

// ---------- Buat password baru (dari tautan email)
if ($('fReset')) {
  const token = new URLSearchParams(location.hash.slice(1)).get('t') || '';
  history.replaceState(null, '', location.pathname); // token tidak tertinggal di riwayat/alamat
  if (!token) { say($('rMsg'), 'Tautan tidak lengkap. Buka lagi tautan dari email, atau minta tautan baru lewat "Lupa password".', 'err'); $('bReset').disabled = true; }
  submit($('fReset'), $('bReset'), $('rMsg'), async () => {
    const p1 = $('rPass').value, p2 = $('rPass2').value;
    if (p1.length < 8) throw new Error('Password minimal 8 karakter.');
    if (p1 !== p2) throw new Error('Kedua password tidak sama.');
    await api('reset.php', { token, password: p1 });
    location.replace('login.html?reset=1');
  });
}

// ---------- Setup admin pertama
if ($('fSetup')) {
  submit($('fSetup'), $('bSetup'), $('sMsg'), async () => {
    const body = { key: $('sKey').value, name: $('sName').value.trim(), username: $('sUser').value.trim().toLowerCase(), email: $('sEmail').value.trim(), password: $('sPass').value };
    if (!body.key || !body.username || !body.email || !body.password) throw new Error('Lengkapi semua isian.');
    await api('setup.php', body);
    location.replace('./');
  });
}
