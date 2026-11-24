// Halaman awal: daftar modul + petunjuk pasang di iPhone.
import { MODULES } from './modules.js';

const nav = document.getElementById('mods');
for (const m of MODULES) {
  const a = document.createElement('a');
  a.className = 'mod'; a.href = m.href;
  const b = document.createElement('b'); b.textContent = m.name;
  const s = document.createElement('span'); s.textContent = m.desc;
  a.append(b, s); nav.append(a);
}
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
if (ios && !standalone) document.getElementById('iosHint').hidden = false;
