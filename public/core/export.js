// Mesin ekspor canvas -> MP4, dipakai semua modul video.
// Modul cukup memberi fungsi draw(ctx, t) yang menggambar satu frame pada detik t.
import { QUALITY, isWebKit } from './device.js';
import { muxMP4 } from './mux.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const aborted = () => new DOMException('Ekspor dibatalkan', 'AbortError');

// Pindah ke detik t dan tunggu frame itu benar-benar siap digambar.
function seekFrame(v, t) {
  return new Promise(res => {
    let done = false, gotFrame = false, seeked = false;
    const fin = () => { if (!done) { done = true; res(); } };
    const useFrameCb = isWebKit && v.requestVideoFrameCallback;
    if (useFrameCb) v.requestVideoFrameCallback(() => { gotFrame = true; if (seeked) fin(); });
    v.addEventListener('seeked', () => { seeked = true; if (!useFrameCb || gotFrame) fin(); else setTimeout(fin, 100); }, { once: true });
    setTimeout(fin, 3000);
    v.currentTime = t;
  });
}

async function firstSupported(Enc, list) {
  for (const c of list) { try { const s = await Enc.isConfigSupported(c); if (s.supported) return c; } catch {} }
  return null;
}

function codecList(w, fps) {
  if (w > 720) return fps > 30 ? ['avc1.64002a', 'avc1.4d002a', 'avc1.42e02a', 'avc1.640033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033', 'avc1.42003e'];
  return ['avc1.64001f', 'avc1.4d001f', 'avc1.42e01f', 'avc1.640028'];
}

async function videoConfig(q, fps) {
  const base = { width: q.w, height: q.h, framerate: fps, bitrate: q.bitrate(fps), avc: { format: 'avc' } };
  const list = codecList(q.w, fps);
  return await firstSupported(VideoEncoder, list.map(codec => ({ ...base, codec, bitrateMode: 'variable', latencyMode: 'quality' })))
      || await firstSupported(VideoEncoder, list.map(codec => ({ ...base, codec })));
}

async function wakeLock() { try { return await navigator.wakeLock.request('screen'); } catch { return null; } }

const toU8 = d => d instanceof Uint8Array ? d : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d);
const collect = store => (c, m) => {
  const d = new Uint8Array(c.byteLength); c.copyTo(d);
  store.chunks.push({ d, dur: c.duration || 0, key: c.type === 'key' });
  if (m && m.decoderConfig && m.decoderConfig.description && !store.desc) store.desc = toU8(m.decoderConfig.description).slice();
};

// Hasil: objek trek audio, atau string alasan ('unsupported' | 'nosound').
async function encodeAudio(file, seconds, signal) {
  if (!window.AudioEncoder) return 'unsupported';
  let ab;
  try {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    ab = await new AC(2, 1, 48000).decodeAudioData(await file.arrayBuffer());
  } catch { return 'nosound'; }
  const ch = Math.min(2, ab.numberOfChannels), sr = ab.sampleRate;
  const cfg = await firstSupported(AudioEncoder, [
    { codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: ch, bitrate: 192000 },
    ...(sr === 48000 ? [{ codec: 'opus', sampleRate: 48000, numberOfChannels: ch, bitrate: 192000 }] : [])]);
  if (!cfg) return 'unsupported';
  const AS = { chunks: [], desc: null, codec: cfg.codec === 'opus' ? 'opus' : 'aac', sr, ch };
  let fail = null;
  const aenc = new AudioEncoder({ output: collect(AS), error: e => fail = e });
  aenc.configure(cfg);
  const total = Math.min(ab.length, Math.round(seconds * sr)), step = 4096;
  const chans = [...Array(ch)].map((_, c) => ab.getChannelData(Math.min(c, ab.numberOfChannels - 1)));
  for (let o = 0; o < total; o += step) {
    if (signal && signal.aborted) { aenc.close(); throw aborted(); }
    const len = Math.min(step, total - o), data = new Float32Array(len * ch);
    chans.forEach((d, c) => data.set(d.subarray(o, o + len), c * len));
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: len, numberOfChannels: ch, timestamp: Math.round(o * 1e6 / sr), data });
    aenc.encode(ad); ad.close();
  }
  await aenc.flush(); aenc.close();
  if (fail) throw fail;
  return AS;
}

// Jalur utama: per frame dengan WebCodecs. Tidak ada frame hilang, tidak tergantung kecepatan HP.
async function viaWebCodecs(o, q) {
  const { video, signal, onProgress } = o;
  const fps = Math.min(o.fps || 30, q.maxFps);
  const vcfg = await videoConfig(q, fps);
  if (!vcfg) return null;
  const cv = document.createElement('canvas'); cv.width = q.w; cv.height = q.h;
  const ctx = cv.getContext('2d', { alpha: false });
  const dur = video.duration, n = Math.max(1, Math.floor(dur * fps + 1e-6));
  const VS = { chunks: [], desc: null, w: q.w, h: q.h, fps };
  let fail = null;
  const venc = new VideoEncoder({ output: collect(VS), error: e => fail = e });
  venc.configure(vcfg);
  video.pause();
  const t0 = performance.now();
  try {
    for (let i = 0; i < n; i++) {
      if (signal && signal.aborted) throw aborted();
      if (fail) throw fail;
      const t = i / fps;
      await seekFrame(video, Math.min(t + 0.0005, dur - 0.001));
      o.draw(ctx, t, q.w / 1080);
      const fr = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(fr, { keyFrame: i % (fps * 2) === 0 });
      fr.close();
      while (venc.encodeQueueSize > q.queue) await sleep(4);
      if (i % 5 === 0 && onProgress) {
        const left = (performance.now() - t0) / (i + 1) * (n - i - 1) / 1000;
        onProgress(0.9 * i / n, `Frame ${i + 1}/${n} · sisa ±${Math.ceil(left)} dtk`);
      }
    }
    await venc.flush();
  } finally {
    if (venc.state !== 'closed') venc.close();
  }
  if (fail) throw fail;
  if (!VS.desc || !VS.chunks.length) throw new Error('encoder video tidak menghasilkan data');
  if (onProgress) onProgress(0.92, 'Menyusun audio…');
  const a = o.audio ? await encodeAudio(o.file, n / fps, signal) : null;
  const AS = a && typeof a === 'object' ? a : null;
  return { blob: muxMP4(VS, AS), fps, w: q.w, h: q.h, audio: AS ? AS.codec : null, audioWhy: typeof a === 'string' ? a : null, ext: 'mp4' };
}

// Cadangan: rekam real-time untuk browser tanpa WebCodecs.
const audioSrc = new WeakMap();
function recorderType() {
  const list = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return window.MediaRecorder ? list.find(t => MediaRecorder.isTypeSupported(t)) || '' : '';
}
async function viaRecorder(o, q) {
  const { video, signal, onProgress } = o;
  const type = recorderType();
  if (!type) throw new Error('Browser ini tidak bisa membuat video. Buka di Chrome atau Safari terbaru.');
  const cv = document.createElement('canvas'); cv.width = q.w; cv.height = q.h;
  cv.className = 'rec-canvas';
  document.body.append(cv); // Safari hanya merekam canvas yang ada di halaman
  const ctx = cv.getContext('2d', { alpha: false });
  const stream = cv.captureStream(30);
  if (o.audio) {
    try {
      let a = audioSrc.get(video);
      if (!a) { const ac = new AudioContext(); const src = ac.createMediaElementSource(video); const dest = ac.createMediaStreamDestination(); src.connect(dest); src.connect(ac.destination); a = { ac, dest }; audioSrc.set(video, a); }
      await a.ac.resume();
      const tr = a.dest.stream.getAudioTracks()[0]; if (tr) stream.addTrack(tr);
      video.muted = false;
    } catch {}
  }
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: q.bitrate(30), audioBitsPerSecond: 128000 });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  video.loop = false; video.pause();
  await seekFrame(video, 0);
  let live = true;
  const tick = () => { if (!live) return; o.draw(ctx, video.currentTime, q.w / 1080); if (onProgress) onProgress(video.currentTime / video.duration, 'Merekam real-time…'); requestAnimationFrame(tick); };
  rec.start(500); tick();
  try {
    await video.play();
    await new Promise((res, rej) => {
      video.addEventListener('ended', res, { once: true });
      if (signal) signal.addEventListener('abort', () => rej(aborted()), { once: true });
    });
  } finally {
    live = false; video.pause(); video.loop = true; video.muted = true;
    await new Promise(r => { rec.onstop = r; try { rec.stop(); } catch { r(); } });
    stream.getTracks().forEach(t => t.kind === 'video' && t.stop());
    cv.remove();
  }
  const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: type.split(';')[0] }), fps: 30, w: q.w, h: q.h, audio: o.audio ? 'live' : null, ext };
}

// o = {video, file, fps, quality:'maks'|'tinggi'|'ringan', audio, draw, onProgress, signal}
export async function exportVideo(o) {
  const lock = await wakeLock();
  try {
    const q = QUALITY[o.quality] || QUALITY.tinggi;
    if (window.VideoEncoder && window.VideoFrame) {
      for (const qq of q.w > 720 ? [q, QUALITY.ringan] : [q]) {
        const r = await viaWebCodecs(o, qq);
        if (r) return { ...r, downgraded: qq !== q };
      }
    }
    return await viaRecorder(o, q);
  } finally {
    if (lock) lock.release().catch(() => {});
  }
}
