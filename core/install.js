// Petunjuk pasang aplikasi. iPhone tidak punya tombol install: tampilkan langkah "Tambah ke Layar Utama".
// Android/Chrome: tangkap beforeinstallprompt dan tampilkan tombol "Pasang aplikasi".
const KEY = 'ji:install-hidden';
const ua = navigator.userAgent;
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|GSA\//.test(ua);
const safari = ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !inApp;
const hidden = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

function card(title, lines, action) {
  const box = document.getElementById('install');
  if (!box || standalone || hidden()) return;
  const h = document.createElement('b'); h.textContent = title;
  const ol = document.createElement('ol');
  for (const l of lines) { const li = document.createElement('li'); li.textContent = l; ol.append(li); }
  const row = document.createElement('div'); row.className = 'row';
  if (action) row.append(action);
  const close = document.createElement('button'); close.type = 'button'; close.className = 'link'; close.textContent = 'Nanti saja';
  close.onclick = () => { box.hidden = true; try { localStorage.setItem(KEY, '1'); } catch {} };
  row.append(close);
  box.replaceChildren(h, ol, row);
  box.hidden = false;
}

if (!standalone) {
  if (ios && safari) {
    card('Pasang JI Studio di iPhone', ['Ketuk tombol Bagikan (kotak dengan panah ke atas) di bar bawah Safari.', 'Gulir, pilih "Tambah ke Layar Utama".', 'Ketuk "Tambah". Buka JI Studio dari ikon di layar utama.']);
  } else if (ios) {
    card('Buka di Safari untuk memasang', [inApp ? 'Browser di dalam aplikasi ini tidak bisa memasang web app.' : 'Pemasangan paling andal lewat Safari.', 'Ketuk menu (⋯ atau ikon kompas), pilih "Buka di Safari".', 'Di Safari: Bagikan → "Tambah ke Layar Utama".']);
  } else {
    addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      const b = document.createElement('button'); b.type = 'button'; b.className = 'main'; b.textContent = 'Pasang aplikasi';
      b.onclick = async () => { e.prompt(); const r = await e.userChoice; if (r.outcome === 'accepted') document.getElementById('install').hidden = true; };
      card('Pasang JI Studio', ['Aplikasi terbuka langsung dari layar utama, tanpa address bar, dan tetap jalan tanpa sinyal.'], b);
    });
  }
}
