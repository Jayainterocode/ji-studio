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

## Login & akun (PHP, tanpa library)

- `public/api/*.php`: masuk, keluar, lupa password (email), buat password dari tautan, setup admin, kelola pengguna.
- Data pengguna di SQLite (bawaan) atau MySQL, **di luar `public_html`**. Password di-hash `password_hash()`.
- Sesi 30 hari, cookie `__Host-ji` HttpOnly + Secure + SameSite=Strict. Tebak password dibatasi 5×/15 menit.
- Tidak ada pendaftaran bebas: admin menambah pengguna, pengguna menerima email undangan untuk membuat password.
- Saat offline, aplikasi tetap bisa dipakai oleh pengguna yang terakhir masuk di HP itu.

### Pemasangan pertama di Hostinger

1. hPanel → Emails: buat mailbox pengirim, mis. `noreply@domainanda.com`.
2. File Manager: salin `tools/ji-config.sample.php` ke **satu folder di atas `public_html`**
   (`/home/uXXXX/domains/<domain>/ji-config.php`), lalu isi `app_url`, `setup_key` (acak ≥ 16 karakter) dan data mailbox.
3. Pastikan ekstensi PHP `pdo_sqlite` aktif (hPanel → Advanced → PHP Configuration → PHP extensions),
   atau pakai DSN MySQL di `ji-config.php`.
4. Buka `https://domainanda.com/setup.html`, isi kunci setup dan buat akun admin (hanya bisa sekali).
5. Masuk → Kelola pengguna → tambah anggota tim.

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
# dengan login (butuh Apache + PHP + HTTPS):
BASE=https://localhost:8443/ LOGIN=admin:password node tools/test-export.cjs video.webm tinggi out.mp4
BASE=https://localhost:8443/ MAILDIR=<folder .eml> SETUP_KEY=... node tools/test-auth.cjs <folder screenshot>
```

## Menambah modul

1. Buat `public/m/<id>/index.html` (salin head dari `m/story/index.html`, termasuk meta CSP) dan JS-nya.
2. Daftarkan di `public/core/modules.js`.
3. Modul video cukup memberi `draw(ctx, t, scale)` ke `exportVideo()` dari `core/export.js`.
4. Halaman modul memanggil `requireUser()` dari `core/auth.js` (pakai `{admin:true}` untuk modul admin) dan `<body class="gate">`.
5. Endpoint server baru: `public/api/<nama>.php`, mulai dengan `define('JI',1); require __DIR__.'/lib/boot.php';` lalu `require_user()`.
6. Jangan pernah menaruh token API di folder `public/` (simpan di `ji-config.php`).
