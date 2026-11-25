// Kelola pengguna (admin): tambah + undangan email, kirim ulang tautan, aktif/nonaktif, ubah peran.
import { api, requireUser, mountUserMenu } from '../../core/auth.js';

const $ = id => document.getElementById(id);
const say = (el, text, kind) => { el.textContent = text; el.className = 'msg' + (kind ? ' ' + kind : ''); };
const me = await requireUser({ admin: true });
mountUserMenu(me);

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function row(u) {
  const li = el('li', u.active ? '' : 'off');
  const name = u.name || u.username;
  const av = el('span', 'avatar', name.charAt(0).toUpperCase()); av.setAttribute('aria-hidden', 'true');
  const txt = el('div', 'u-txt');
  const b = el('b', null, name);
  if (u.role === 'admin') b.append(el('span', 'tag yl', 'ADMIN'));
  if (!u.active) b.append(el('span', 'tag', 'NONAKTIF'));
  else if (!u.hasPassword) b.append(el('span', 'tag', 'BELUM AKTIVASI'));
  txt.append(b, el('small', null, `@${u.username} · ${u.email}`));
  const act = el('div', 'u-act');
  const btn = (label, action, cls) => {
    const x = el('button', cls || '', label); x.type = 'button';
    x.onclick = () => run(x, { action, id: u.id });
    act.append(x);
  };
  if (u.id !== me.id) {
    if (u.active) btn(u.hasPassword ? 'Kirim reset' : 'Kirim ulang undangan', 'invite');
    btn(u.role === 'admin' ? 'Jadikan staf' : 'Jadikan admin', 'role');
    btn(u.active ? 'Nonaktifkan' : 'Aktifkan', 'toggle', u.active ? 'danger' : '');
  } else {
    act.append(el('small', null, 'Akun Anda'));
  }
  li.append(av, txt, act);
  return li;
}

async function load() {
  try {
    const { users } = await api('users.php');
    $('list').replaceChildren(...users.map(row));
    say($('lMsg'), `${users.length} pengguna`);
  } catch (e) { say($('lMsg'), e.message, 'err'); }
}

async function run(btn, body) {
  if (body.action === 'toggle' && btn.textContent === 'Nonaktifkan' && !confirm('Nonaktifkan pengguna ini? Ia langsung keluar dari semua perangkat.')) return;
  btn.disabled = true;
  try {
    const r = await api('users.php', body);
    await load();
    if (body.action === 'invite') say($('lMsg'), r.mailed ? 'Email terkirim.' : 'Email gagal dikirim. Periksa pengaturan email di ji-config.php.', r.mailed ? 'ok' : 'err');
  } catch (e) { say($('lMsg'), e.message, 'err'); btn.disabled = false; }
}

$('fAdd').addEventListener('submit', async e => {
  e.preventDefault();
  const b = $('bAdd');
  const body = { action: 'create', name: $('aName').value.trim(), username: $('aUser').value.trim().toLowerCase(), email: $('aEmail').value.trim(), role: $('aRole').value };
  if (!body.username || !body.email) return say($('aMsg'), 'Isi username dan email.', 'err');
  b.disabled = true; b.classList.add('busy'); say($('aMsg'), '');
  try {
    const r = await api('users.php', body);
    $('fAdd').reset();
    say($('aMsg'), r.mailed ? `Undangan terkirim ke ${body.email}.` : 'Pengguna dibuat, tetapi email gagal dikirim. Periksa pengaturan email, lalu tekan "Kirim ulang undangan".', r.mailed ? 'ok' : 'err');
    await load();
  } catch (err) { say($('aMsg'), err.message, 'err'); }
  finally { b.disabled = false; b.classList.remove('busy'); }
});

load();
