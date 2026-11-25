// Overlay story pengantaran. Semua koordinat dalam ruang 1080x1920; s = skala ke kanvas tujuan.
// Area aman: 250 px atas & bawah, margin 108 px. Tengah (y 640–1300) dibiarkan bersih.
const W = 1080, H = 1920, M = 108;
const C = { pri: '#4070b3', yl: '#f4ca45', wh: '#ffffff', dk: '#2d5592' };
const clamp = x => Math.max(0, Math.min(1, x));
const p = (t, a, b) => clamp((t - a) / (b - a));
const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const outCubic = x => 1 - (1 - x) ** 3;
const font = (w, sz) => `${w} ${sz}px Montserrat, sans-serif`;
export const FONTS = [font(900, 72), font(800, 34), font(800, 24), font(700, 24), font(700, 40)];

function wrap(c, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
const spacing = (c, v) => { if ('letterSpacing' in c) c.letterSpacing = v; };

function drawVideo(c, video) {
  if (video && video.videoWidth) {
    const s = Math.max(W / video.videoWidth, H / video.videoHeight), w = video.videoWidth * s, h = video.videoHeight * s;
    c.drawImage(video, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5a6d86'); g.addColorStop(1, '#26344a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = font(700, 40); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Video Anda tampil di sini', W / 2, H / 2); c.textAlign = 'left';
  }
}

function gradients(c, a) {
  c.globalAlpha = a;
  let g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, 'rgba(45,85,146,.92)'); g.addColorStop(1, 'rgba(45,85,146,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 640);
  g = c.createLinearGradient(0, H, 0, H - 620); g.addColorStop(0, 'rgba(45,85,146,.92)'); g.addColorStop(1, 'rgba(45,85,146,0)');
  c.fillStyle = g; c.fillRect(0, H - 620, W, 620);
  c.globalAlpha = 1;
}

function header(c, a, d, logo) {
  c.globalAlpha = a; c.fillStyle = C.wh; c.font = font(700, 24); c.textBaseline = 'top'; spacing(c, '3px');
  c.textAlign = 'left'; c.fillText(String(d.tag).toUpperCase(), M, 250);
  if (logo) { const h = 52, w = logo.width * h / logo.height; c.drawImage(logo, W - M - w, 236, w, h); }
  else { c.textAlign = 'right'; c.fillText('JAYA INTERO', W - M, 250); }
  c.textAlign = 'left'; spacing(c, '0px'); c.globalAlpha = 1;
}

// Baris 1 tetap "PENGANTARAN"; baris 2 dari form (kosong = satu baris saja).
function banner(c, t, d) {
  let fs = 72; c.font = font(900, fs);
  const l1 = 'PENGANTARAN', l2 = String(d.judul2 || '').toUpperCase(), padX = 44, padY = 34, rows = l2 ? 2 : 1;
  let tw = Math.max(c.measureText(l1).width, c.measureText(l2).width);
  const maxBox = W - 2 * M - 150;
  if (tw + padX * 2 > maxBox) { fs = Math.floor(fs * (maxBox - padX * 2) / tw); c.font = font(900, fs); tw = Math.max(c.measureText(l1).width, c.measureText(l2).width); }
  const lh = fs * 1.08, bw = tw + padX * 2, bh = padY * 2 + lh * rows, y = 312;
  const k = outBack(p(t, .2, .7)), ks = outBack(p(t, .27, .77));
  const x = -bw - 40 + (M + bw + 40) * k, xs = -bw - 40 + (M + bw + 40) * ks;
  c.fillStyle = C.dk; c.beginPath(); c.roundRect(xs + 10, y + 10, bw, bh, 28); c.fill();
  c.fillStyle = C.pri; c.beginPath(); c.roundRect(x, y, bw, bh, 28); c.fill();
  c.lineWidth = 4; c.strokeStyle = C.wh; c.beginPath(); c.roundRect(x + 2, y + 2, bw - 4, bh - 4, 26); c.stroke();
  c.textBaseline = 'alphabetic';
  const b1 = y + padY + fs * .86, b2 = b1 + lh;
  c.fillStyle = C.dk; c.fillText(l1, x + padX, b1 + 3); c.fillStyle = C.wh; c.fillText(l1, x + padX, b1);
  const w2 = p(t, .5, .9);
  if (l2 && w2 > 0) {
    const sc = 1 + .08 * Math.sin(Math.PI * w2), ox = x + padX, oy = b2 - fs * .35;
    c.save(); c.beginPath(); c.rect(x + padX - 10, b2 - fs, (tw + 20) * outCubic(w2), fs * 1.3); c.clip();
    c.translate(ox, oy); c.scale(sc, sc); c.translate(-ox, -oy);
    c.fillStyle = C.dk; c.fillText(l2, x + padX, b2 + 3); c.fillStyle = C.yl; c.fillText(l2, x + padX, b2);
    c.restore();
  }
  return { right: M + bw, cy: y + bh / 2 };
}

function speedLines(c, t, b) {
  const ws = [96, 66, 40], h = 14, gap = 22, sk = h * Math.tan(30 * Math.PI / 180);
  ws.forEach((w, i) => {
    const k = outCubic(p(t, .7 + i * .08, .92 + i * .08)); if (!k) return;
    const x = b.right + 34 + (1 - k) * 220, y = b.cy - ((h * 3 + gap * 2) / 2) + i * (h + gap);
    c.globalAlpha = k; c.strokeStyle = C.yl; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + sk + w, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.stroke();
  });
  c.globalAlpha = 1;
}

function infoBar(c, t, d) {
  const cols = [['Tujuan', d.tujuan], ['Muatan', d.muatan], ['Tanggal', d.tanggal]];
  const bw = W - 2 * M, cw = bw / 3, inner = cw - 40;
  let vs = 34, lines;
  for (; vs >= 24; vs -= 2) { c.font = font(800, vs); lines = cols.map(x => wrap(c, x[1], inner)); if (lines.every(l => l.length <= 2 && l.every(s => c.measureText(s).width <= inner))) break; }
  lines = lines.map(l => l.slice(0, 2));
  const maxL = Math.max(...lines.map(l => l.length)), lh = vs * 1.25;
  const bh = 34 + 24 + 18 + lh * maxL + 30, by = H - 270 - bh;
  const k = outCubic(p(t, .9, 1.25)); if (!k) return;
  const off = (1 - k) * 140;
  c.globalAlpha = k;
  c.fillStyle = C.dk; c.beginPath(); c.roundRect(M, by + off, bw, bh, 28); c.fill();
  c.lineWidth = 2; c.strokeStyle = C.wh; c.beginPath(); c.roundRect(M + 1, by + off + 1, bw - 2, bh - 2, 27); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)';
  for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(M + cw * i, by + off + 26); c.lineTo(M + cw * i, by + off + bh - 26); c.stroke(); }
  cols.forEach((col, i) => {
    const kc = outCubic(p(t, 1 + i * .1, 1.3 + i * .1)); if (!kc) return;
    const x = M + cw * i + 20, y = by + off + 34 + (1 - kc) * 24;
    c.globalAlpha = k * kc; c.textBaseline = 'top';
    c.font = font(800, 24); spacing(c, '2px'); c.fillStyle = C.yl; c.fillText(col[0].toUpperCase(), x, y); spacing(c, '0px');
    c.font = font(800, vs); c.fillStyle = C.wh; lines[i].forEach((s, j) => c.fillText(s, x, y + 40 + j * lh));
  });
  c.globalAlpha = 1;
}

function safeGuides(c) {
  c.save(); c.setLineDash([16, 12]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,80,80,.9)';
  [250, H - 250].forEach(y => { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
  [M, W - M].forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); });
  c.restore();
}

// Membuat penggambar dengan layer overlay sendiri (supaya fade-out berlaku menyeluruh).
export function createRenderer() {
  let layer = null, lc = null;
  // o = {video, logo, data:{tujuan,muatan,tanggal,tag}, fade:boolean, dur, guides}
  return function draw(ctx, t, s, o) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!layer || layer.width !== cw || layer.height !== ch) {
      layer = document.createElement('canvas'); layer.width = cw; layer.height = ch; lc = layer.getContext('2d');
    }
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    drawVideo(ctx, o.video);
    const fade = o.fade && o.dur ? clamp((o.dur - t) / .5) : 1;
    if (fade > 0) {
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, cw, ch); lc.setTransform(s, 0, 0, s, 0, 0);
      const a = p(t, 0, .4);
      gradients(lc, a); header(lc, a, o.data, o.logo);
      speedLines(lc, t, banner(lc, t, o.data)); infoBar(lc, t, o.data);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = fade; ctx.drawImage(layer, 0, 0); ctx.globalAlpha = 1;
      ctx.setTransform(s, 0, 0, s, 0, 0);
    }
    if (o.guides) safeGuides(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
}
