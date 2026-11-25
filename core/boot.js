// Dipanggil di setiap halaman: daftarkan service worker dan tawarkan versi baru.
const ROOT = new URL('../', import.meta.url);

function offerUpdate(worker) {
  if (document.querySelector('.toast')) return;
  const box = document.createElement('div');
  box.className = 'toast';
  box.setAttribute('role', 'status');
  const txt = document.createElement('span');
  txt.textContent = 'Versi baru tersedia';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Muat ulang';
  btn.onclick = () => { btn.disabled = true; worker.postMessage('skip'); };
  box.append(txt, btn);
  document.body.append(box);
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  // Trusted Types: hanya sw.js milik sendiri yang boleh didaftarkan
  const swURL = new URL('sw.js', ROOT).href;
  const policy = window.trustedTypes ? trustedTypes.createPolicy('ji', {
    createScriptURL: u => { if (u === swURL) return u; throw new TypeError('URL skrip ditolak'); }
  }) : null;
  navigator.serviceWorker.register(policy ? policy.createScriptURL(swURL) : swURL, { scope: ROOT.pathname }).then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}
