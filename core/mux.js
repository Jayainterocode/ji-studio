// Penyusun MP4 minimal (H.264 + AAC/Opus), faststart: moov sebelum mdat. Tanpa library.
// V = {chunks:[{d,key}], desc, w, h, fps}; A = {chunks:[{d,dur}], desc, codec:'aac'|'opus', sr, ch} | null
export function muxMP4(V, A) {
  const enc = new TextEncoder();
  const u32 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255], u16 = n => [n >> 8 & 255, n & 255];
  const u64 = n => [...u32(Math.floor(n / 4294967296)), ...u32(n >>> 0)];
  const cat = parts => {
    const a = parts.map(p => p instanceof Uint8Array ? p : Uint8Array.from(p));
    const o = new Uint8Array(a.reduce((s, p) => s + p.length, 0));
    let i = 0; a.forEach(p => { o.set(p, i); i += p.length; });
    return o;
  };
  const box = (t, ...p) => { const b = cat(p); return cat([u32(b.length + 8), enc.encode(t), b]); };
  const fbox = (t, v, f, ...p) => box(t, [v, f >> 16 & 255, f >> 8 & 255, f & 255], ...p);
  const zeros = n => new Array(n).fill(0);
  const matrix = [...u32(0x10000), ...zeros(12), ...u32(0x10000), ...zeros(12), ...u32(0x40000000)];

  const tracks = [];
  const vts = 90000, vd = Math.round(vts / V.fps);
  // Info warna dibiarkan dari SPS encoder (tanpa kotak colr) agar tidak ada dua sumber yang bertentangan.
  tracks.push({
    id: 1, kind: 'vide', ts: vts, samples: V.chunks.map(c => ({ d: c.d, dur: vd, key: c.key })),
    entry: () => box('avc1', zeros(6), u16(1), zeros(16), u16(V.w), u16(V.h), u32(0x480000), u32(0x480000), u32(0), u16(1), zeros(32), u16(24), u16(0xffff), box('avcC', V.desc))
  });
  if (A && A.chunks.length) {
    const ats = A.sr;
    let sampleEntry;
    if (A.codec === 'opus') {
      let pre = 312, gain = 0; const d = A.desc;
      if (d && d.length >= 19 && String.fromCharCode(...d.slice(0, 8)) === 'OpusHead') { pre = d[10] | d[11] << 8; gain = (d[16] | d[17] << 8) << 16 >> 16; }
      sampleEntry = () => box('Opus', zeros(6), u16(1), zeros(8), u16(A.ch), u16(16), zeros(4), u32(48000 * 65536), box('dOps', [0, A.ch], u16(pre), u32(A.sr), u16(gain & 0xffff), [0]));
    } else {
      let asc = A.desc && A.desc.length ? Array.from(A.desc) : null;
      if (!asc) { const fi = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000].indexOf(A.sr); asc = u16(2 << 11 | (fi < 0 ? 4 : fi) << 7 | A.ch << 3); }
      const dsi = [5, asc.length, ...asc], dcd = [4, 13 + dsi.length, 0x40, 0x15, 0, 0, 0, ...u32(192000), ...u32(192000), ...dsi], esd = [3, 3 + dcd.length + 3, ...u16(2), 0, ...dcd, 6, 1, 2];
      sampleEntry = () => box('mp4a', zeros(6), u16(1), zeros(8), u16(A.ch), u16(16), zeros(4), u32(A.sr * 65536 >>> 0), fbox('esds', 0, 0, esd));
    }
    tracks.push({ id: 2, kind: 'soun', ts: ats, samples: A.chunks.map(c => ({ d: c.d, dur: Math.max(1, Math.round(c.dur * ats / 1e6)), key: true })), entry: sampleEntry });
  }
  tracks.forEach(t => t.dur = t.samples.reduce((s, x) => s + x.dur, 0));
  const movDur = Math.max(...tracks.map(t => Math.round(t.dur * 1000 / t.ts)));

  function moov(base) {
    let off = base;
    const offs = tracks.map(t => t.samples.map(s => { const o = off; off += s.d.length; return o; }));
    return box('moov',
      fbox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movDur), u32(0x10000), u16(0x100), zeros(10), matrix, zeros(24), u32(tracks.length + 1)),
      ...tracks.map((t, ti) => {
        const S = t.samples, vid = t.kind === 'vide';
        const stts = []; S.forEach(s => { const l = stts[stts.length - 1]; if (l && l[1] === s.dur) l[0]++; else stts.push([1, s.dur]); });
        const keys = S.map((s, i) => s.key ? i + 1 : 0).filter(Boolean);
        return box('trak',
          fbox('tkhd', 0, 3, u32(0), u32(0), u32(t.id), u32(0), u32(Math.round(t.dur * 1000 / t.ts)), zeros(8), u16(0), u16(0), u16(vid ? 0 : 0x100), u16(0), matrix, u32(vid ? V.w * 65536 : 0), u32(vid ? V.h * 65536 : 0)),
          box('mdia',
            fbox('mdhd', 0, 0, u32(0), u32(0), u32(t.ts), u32(t.dur), u16(0x55c4), u16(0)),
            fbox('hdlr', 0, 0, u32(0), enc.encode(t.kind), zeros(12), enc.encode(vid ? 'VideoHandler' : 'SoundHandler'), [0]),
            box('minf',
              vid ? fbox('vmhd', 0, 1, zeros(8)) : fbox('smhd', 0, 0, zeros(4)),
              box('dinf', fbox('dref', 0, 0, u32(1), fbox('url ', 0, 1))),
              box('stbl',
                fbox('stsd', 0, 0, u32(1), t.entry()),
                fbox('stts', 0, 0, u32(stts.length), ...stts.map(([c, d]) => [...u32(c), ...u32(d)])),
                ...(vid ? [fbox('stss', 0, 0, u32(keys.length), ...keys.map(k => u32(k)))] : []),
                fbox('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1)),
                fbox('stsz', 0, 0, u32(0), u32(S.length), ...S.map(s => u32(s.d.length))),
                fbox('co64', 0, 0, u32(S.length), ...offs[ti].map(o => u64(o)))))));
      }));
  }
  const ftyp = box('ftyp', enc.encode('isom'), u32(512), enc.encode('isomiso2avc1mp41'));
  const mdatLen = tracks.reduce((s, t) => s + t.samples.reduce((a, x) => a + x.d.length, 0), 0);
  const base = ftyp.length + moov(0).length + 16;
  const parts = [ftyp, moov(base), cat([u32(1), enc.encode('mdat'), u64(mdatLen + 16)])];
  tracks.forEach(t => t.samples.forEach(s => parts.push(s.d)));
  return new Blob(parts, { type: 'video/mp4' });
}
