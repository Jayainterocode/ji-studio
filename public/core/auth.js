// Sesi pengguna: cek login, panggil API, menu pengguna di header.
const ROOT = new URL('../', import.meta.url);
const KEY = 'ji:user';

export async function api(path, body) {
  const init = body === undefined
    ? { credentials: 'same-origin', headers: { 'X-JI': '1' } }
    : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-JI': '1' }, body: JSON.stringify(body) };
  let r;
  try { r = await fetch(new URL('api/' + path, ROOT), init); }
  catch { const e = new Error('Tidak ada koneksi internet.'); e.offline = true; throw e; }
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.error || `Server bermasalah (${r.status}).`); e.status = r.status; e.data = j; throw e; }
  return j;
}

const cached = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const remember = u => { try { u ? localStorage.setItem(KEY, JSON.stringify(u)) : localStorage.removeItem(KEY); } catch {} };

export function loginURL(next) {
  const u = new URL('login.html', ROOT);
  if (next) u.searchParams.set('next', next);
  return u.href;
}
// Hanya izinkan kembali ke halaman di aplikasi ini (cegah open redirect).
export function safeNext(v) {
  try { const u = new URL(v || '', ROOT); if (u.origin === location.origin && u.pathname.startsWith(ROOT.pathname)) return u.href; } catch {}
  return ROOT.href;
}

// Pastikan sudah masuk. Saat offline, pakai data pengguna terakhir (aplikasi tetap bisa dipakai tanpa sinyal).
export async function requireUser({ admin = false } = {}) {
  let user;
  try {
    user = (await api('me.php')).user;
    remember(user);
  } catch (e) {
    if (e.status === 401) {
      remember(null);
      location.replace(loginURL(location.pathname + location.search));
      return new Promise(() => {});
    }
    user = cached();
    if (!user) { location.replace(loginURL(location.pathname)); return new Promise(() => {}); }
    user = { ...user, offline: true };
  }
  if (admin && user.role !== 'admin') { location.replace(ROOT.href); return new Promise(() => {}); }
  document.body.classList.add('ready');
  return user;
}

export async function logout() {
  try { await api('logout.php', {}); } catch {}
  remember(null);
  location.replace(loginURL());
}

// Menu pengguna di header: inisial + nama, tombol Keluar.
export function mountUserMenu(user) {
  const slot = document.getElementById('who');
  if (!slot) return;
  const name = user.name || user.username;
  const av = document.createElement('span'); av.className = 'avatar'; av.textContent = name.trim().charAt(0).toUpperCase() || '?'; av.setAttribute('aria-hidden', 'true');
  const nm = document.createElement('span'); nm.className = 'who-name'; nm.textContent = name;
  const out = document.createElement('button'); out.type = 'button'; out.className = 'ghost'; out.textContent = 'Keluar';
  out.onclick = () => { out.disabled = true; logout(); };
  slot.replaceChildren(av, nm, out);
  if (user.offline) { const o = document.createElement('span'); o.className = 'badge'; o.textContent = 'Offline'; slot.prepend(o); }
}
