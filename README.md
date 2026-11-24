# JI Studio

PWA konten media sosial Jaya Intero. HTML, CSS, dan JS murni: tanpa framework, tanpa build step, tanpa dependensi.
Total semua aset ±94 KB (gzip). Modul pertama: **Story Pengantaran** (video truk jadi MP4 9:16).

## Struktur

```
public/                  ← isi folder ini yang diunggah ke Hostinger
  .htaccess              HTTPS paksa, CSP ketat, header keamanan, cache
  index.html             peluncur modul
  sw.js                  service worker (VERSION & ASSETS diisi tools/release.py)
  manifest.webmanifest
  core/                  dipakai semua modul
    app.css boot.js shell.js modules.js store.js save.js device.js
    export.js            mesin ekspor canvas → MP4 (WebCodecs, cadangan MediaRecorder)
    mux.js               penyusun MP4 buatan sendiri
  fonts/montserrat.woff2 subset Latin, bobot 500–900
  img/                   ikon aplikasi (bukan /icons/: bentrok dengan alias bawaan Apache)
  m/story/               modul Story Pengantaran
tools/
  release.py             versi cache + cek anggaran ukuran + dist/ji-studio.zip
  icons.mjs, icon.svg    render ikon PNG
  test-export.cjs        uji ekspor ujung-ke-ujung (Playwright)
```

## Rilis ke Hostinger lewat GitHub (disarankan)

- Branch `main` = kode sumber. Setiap push ke `main`, GitHub Action menjalankan `tools/release.py`
  lalu menaruh isi `public/` di branch **`deploy`** (file situs langsung di root).
- Hostinger hPanel → Websites → domain → **Git**: repositori `Jayainterocode/ji-studio`, branch **`deploy`**,
  direktori kosong (= `public_html`). Aktifkan Auto Deployment, salin webhook URL-nya ke
  GitHub → Settings → Webhooks.
- Pastikan SSL aktif (hPanel → Security → SSL).

Jangan deploy branch `main`: isinya ada `tools/` dan file situs ada di subfolder `public/`.

## Rilis manual (tanpa Git)

1. `python3 tools/release.py` (gagal bila ada file melebihi anggaran ukuran).
2. hPanel → File Manager → folder domain/subdomain → unggah `dist/ji-studio.zip` → Extract.

## Uji lokal

```
python3 -m http.server -d public 8080
BASE=http://localhost:8080/ node tools/test-export.cjs video.webm tinggi out.mp4
```

## Menambah modul

1. Buat `public/m/<id>/index.html` (salin head dari `m/story/index.html`, termasuk meta CSP) dan JS-nya.
2. Daftarkan di `public/core/modules.js`.
3. Modul video cukup memberi `draw(ctx, t, scale)` ke `exportVideo()` dari `core/export.js`.
4. Jangan pernah menaruh token API di folder `public/` (lihat bagian Keamanan di PRD).
