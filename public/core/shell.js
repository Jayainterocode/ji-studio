// Beranda: sapaan, daftar modul (modul admin hanya untuk admin), petunjuk pasang di iPhone.
import { MODULES } from './modules.js';
import { requireUser, mountUserMenu } from './auth.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (d, size, cls) => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.append(p);
  return s;
};

function card(m) {
  const a = document.createElement('a'); a.className = 'mod'; a.href = m.href;
  const ico = document.createElement('span'); ico.className = 'ico' + (m.admin ? ' dk' : ''); ico.append(svg(m.icon, 26));
  const txt = document.createElement('span'); txt.className = 'mod-txt';
  const b = document.createElement('b'); b.textContent = m.name;
  const s = document.createElement('span'); s.textContent = m.desc;
  txt.append(b, s);
  a.append(ico, txt, svg('M9 5l7 7-7 7', 20, 'chev'));
  return a;
}

const user = await requireUser();
mountUserMenu(user);
const first = (user.name || user.username).split(/\s+/)[0];
document.getElementById('hello').textContent = `Halo, ${first}`;
for (const m of MODULES) {
  if (m.admin && user.role !== 'admin') continue;
  document.getElementById(m.admin ? 'adminMods' : 'mods').append(card(m));
}
document.getElementById('adminBox').hidden = user.role !== 'admin';

const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
if (ios && !standalone) document.getElementById('iosHint').hidden = false;
