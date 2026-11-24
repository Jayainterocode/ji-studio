// Modul Story Pengantaran: form + pratinjau + ekspor.
import { store } from '../../core/store.js';
import { QUALITY, defaultQuality, isLowEnd, audioSupported } from '../../core/device.js';
import { canShareFile, shareFile, downloadFile, slug } from '../../core/save.js';
import { createRenderer, FONTS } from './overlay.js';
import { requireUser, mountUserMenu } from '../../core/auth.js';

mountUserMenu(await requireUser());

const MAX_VIDEO_BYTES = 500 * 1024 * 1024, MAX_VIDEO_SEC = 60, MAX_LOGO_BYTES = 5 * 1024 * 1024;
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DEF = { judul2: 'BAJA RINGAN', tujuan: 'Kabanjahe', muatan: 'C75, Reng & Resplank', tag: '#PENGIRIMAN' };

const $ = id => document.getElementById(id);
const cv = $('cv'), vid = $('vid');
const S = store('story');
const F = { judul2: $('fJudul2'), tujuan: $('fTujuan'), muatan: $('fMuatan'), tanggal: $('fTanggal'), tag: $('fTag') };

// Pratinjau lebih kecil dari hasil ekspor supaya HP lambat tetap lancar.
if (isLowEnd) { cv.width = 360; cv.height = 640; }
const ctx = cv.getContext('2d', { alpha: false });
const drawPreview = createRenderer(), drawExport = createRenderer();

let hasVideo = false, vFile = null, vURL = null, logo = null, exporting = false, srcFps = 0, last = null, ac = null;
let clock0 = performance.now(), lastPaint = 0;

const say = (t, err) => { const m = $('msg'); m.textContent = t; m.classList.toggle('err', !!err); };
const prog = f => { const v = Math.max(0, Math.min(1, f)) * 100; $('prog').style.width = v.toFixed(1) + '%'; $('pct').textContent = Math.round(v) + '%'; };
const today = () => { const d = new Date(); return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const data = () => ({ judul2: F.judul2.value.trim(), tujuan: F.tujuan.value.trim(), muatan: F.muatan.value.trim(), tanggal: F.tanggal.value.trim(), tag: F.tag.value.trim() });

// --- Form: isian diingat, tanggal selalu hari ini
for (const k of ['judul2', 'tujuan', 'muatan', 'tag']) {
  F[k].value = S.get(k, DEF[k]);
  F[k].addEventListener('input', () => S.set(k, F[k].value));
}
F.tanggal.value = today();

// --- Kualitas
for (const [k, q] of Object.entries(QUALITY)) {
  const o = document.createElement('option'); o.value = k; o.textContent = q.label; $('sQual').append(o);
}
$('sQual').value = QUALITY[S.get('q')] ? S.get('q') : defaultQuality;
$('sQual').addEventListener('change', () => { S.set('q', $('sQual').value); resetResult(); });
if (isLowEnd) $('qHint').textContent = 'HP ini terdeteksi lambat, mode Ringan dipilih otomatis.';

// --- Beri tahu sejak awal bila browser tidak bisa menyertakan suara
audioSupported().then(ok => {
  if (!ok) $('aHint').hidden = false;
}).catch(() => {});

// --- Pratinjau
function paint(now) {
  requestAnimationFrame(paint);
  if (exporting || document.hidden) return;
  if (isLowEnd && now - lastPaint < 32) return; // maks ±30 fps di HP lambat
  lastPaint = now;
  const t = hasVideo ? vid.currentTime : ((now - clock0) / 1000) % 7;
  drawPreview(ctx, t, cv.width / 1080, {
    video: hasVideo ? vid : null, logo, data: data(),
    fade: $('cFade').checked && hasVideo, dur: hasVideo ? vid.duration : 0, guides: $('cSafe').checked
  });
}
Promise.all(FONTS.map(f => document.fonts.load(f))).catch(() => {}).finally(() => requestAnimationFrame(paint));

// --- Deteksi fps asli dari jeda antar-frame saat pratinjau
let fpsSamples = [], lastMT = null;
function fpsWatch(_, m) {
  if (lastMT != null) { const d = m.mediaTime - lastMT; if (d > 0.005 && d < 0.1) fpsSamples.push(d); }
  lastMT = m.mediaTime;
  if (fpsSamples.length >= 40 && !srcFps) {
    const s = fpsSamples.slice().sort((a, b) => a - b), raw = 1 / s[Math.floor(s.length * .25)];
    srcFps = [24, 25, 30, 50, 60].reduce((a, b) => Math.abs(b - raw) < Math.abs(a - raw) ? b : a);
    showInfo();
  }
  if (!srcFps) vid.requestVideoFrameCallback(fpsWatch);
}
function showInfo() {
  const port = vid.videoHeight >= vid.videoWidth;
  $('vInfo').textContent = `${vid.videoWidth}×${vid.videoHeight} · ${vid.duration.toFixed(1)} dtk${srcFps ? ' · ' + srcFps + ' fps' : ''}${port ? '' : ' · bukan portrait, dipotong tengah'}`;
}

// --- Input file (pilih atau seret)
function setupDrop(el, input, onFile) {
  input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('on'); });
  el.addEventListener('dragleave', () => el.classList.remove('on'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) onFile(f); });
}

const looksLikeVideo = f => f.type ? f.type.startsWith('video/') : /\.(mp4|m4v|mov|webm)$/i.test(f.name);
setupDrop($('dropV'), $('fileV'), f => {
  if (exporting) return;
  if (!looksLikeVideo(f)) return say('File ini bukan video.', true);
  if (f.size > MAX_VIDEO_BYTES) return say('Video terlalu besar (maks 500 MB). Potong dulu di Galeri.', true);
  resetResult();
  if (vURL) URL.revokeObjectURL(vURL);
  vURL = URL.createObjectURL(f);
  vFile = f; srcFps = 0; fpsSamples = []; lastMT = null; hasVideo = false;
  $('bExport').disabled = true;
  vid.onerror = () => { hasVideo = false; say('Video tidak bisa dibuka. Coba rekam ulang dalam format MP4 / H.264.', true); };
  vid.onloadedmetadata = () => {
    if (!(vid.duration > 0) || vid.duration > MAX_VIDEO_SEC + 0.5) {
      say(`Video ${Math.round(vid.duration)} detik terlalu panjang. Maksimal ${MAX_VIDEO_SEC} detik.`, true);
      return;
    }
    hasVideo = true;
    $('vName').textContent = f.name;
    $('dropV').classList.add('done'); $('vIco').setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
    showInfo();
    $('bExport').disabled = false;
    say('Siap. Cek pratinjau, lalu tekan Ekspor video.');
    vid.currentTime = 0; vid.play().catch(() => {});
    if (vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(fpsWatch);
  };
  vid.src = vURL;
});

setupDrop($('dropL'), $('fileL'), async f => {
  if (!/^image\/(png|webp|jpeg)$/.test(f.type)) return say('Logo harus PNG, WebP, atau JPG.', true);
  if (f.size > MAX_LOGO_BYTES) return say('Logo terlalu besar (maks 5 MB).', true);
  try {
    logo = await createImageBitmap(f);
    $('lName').textContent = f.name;
    $('dropL').classList.add('done');
    resetResult();
  } catch { say('Logo tidak bisa dibuka.', true); }
});

// --- Tombol
$('bReplay').onclick = () => { clock0 = performance.now(); if (hasVideo) { vid.currentTime = 0; vid.play().catch(() => {}); } };

function setBusy(on) {
  exporting = on;
  for (const id of ['bExport', 'bReplay', 'sQual']) $(id).disabled = on;
  $('bCancel').hidden = !on;
  if (on) { $('bShare').hidden = true; $('bDown').hidden = true; }
}
function resetResult() {
  last = null; $('bShare').hidden = true; $('bDown').hidden = true; prog(0);
}
for (const k in F) F[k].addEventListener('input', resetResult);
$('cFade').addEventListener('change', resetResult);
$('cAudio').addEventListener('change', resetResult);

$('bCancel').onclick = () => { if (ac) ac.abort(); };

$('bExport').onclick = async () => {
  if (exporting || !hasVideo) return;
  setBusy(true);
  ac = new AbortController();
  try {
    await Promise.all(FONTS.map(f => document.fonts.load(f)));
    if (!srcFps && vid.requestVideoFrameCallback) {
      say('Membaca frame rate video…');
      vid.play().catch(() => {});
      for (let k = 0; k < 40 && !srcFps; k++) await new Promise(r => setTimeout(r, 50));
    }
    const d = data();
    const opts = { video: vid, logo, data: d, fade: $('cFade').checked, dur: vid.duration, guides: false };
    const { exportVideo } = await import('../../core/export.js');
    const r = await exportVideo({
      video: vid, file: vFile, fps: srcFps || 30, quality: $('sQual').value, audio: $('cAudio').checked, signal: ac.signal,
      draw: (c, t, s) => drawExport(c, t, s, opts),
      onProgress: (f, txt) => { prog(f); say(txt); }
    });
    prog(1);
    last = { blob: r.blob, name: `story-pengantaran-${slug(d.tujuan)}.${r.ext}` };
    let m = `Selesai: ${r.w}×${r.h}, ${r.fps} fps, ${(r.blob.size / 1048576).toFixed(1)} MB.`;
    if (r.downgraded) m += ' HP ini tidak mendukung 1080p, hasil dibuat 720p.';
    if ($('cAudio').checked && !r.audio) m += r.audioWhy === 'nosound' ? ' Suara tidak bisa diambil dari video ini (mungkin videonya tanpa suara).' : ' Browser ini belum bisa menyertakan suara.';
    if (r.ext === 'webm') m += ' Hasil berformat WebM; untuk MP4 pakai Chrome atau Safari terbaru.';
    say(m);
    $('bShare').hidden = !canShareFile(last.blob, last.name);
    $('bDown').hidden = false;
  } catch (e) {
    prog(0);
    if (e && e.name === 'AbortError') say('Ekspor dibatalkan.');
    else say('Ekspor gagal: ' + (e && e.message || e), true);
  } finally {
    setBusy(false);
    ac = null;
    vid.loop = true; vid.muted = true; vid.currentTime = 0; vid.play().catch(() => {});
  }
};

$('bShare').onclick = async () => {
  if (!last) return;
  try { await shareFile(last.blob, last.name, 'Story pengantaran'); say('Pilih "Simpan Video" untuk menyimpan ke Foto.'); }
  catch (e) { if (e && e.name !== 'AbortError') say('Gagal membagikan: ' + e.message, true); }
};
$('bDown').onclick = () => { if (last) { downloadFile(last.blob, last.name); say('Diunduh: ' + last.name); } };
