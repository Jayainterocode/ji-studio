// Profil perangkat: tentukan mode ringan dan preset kualitas ekspor.
const mem = navigator.deviceMemory;            // tidak ada di Safari
const cores = navigator.hardwareConcurrency || 0;
export const isLowEnd = (mem !== undefined && mem <= 2) || (cores > 0 && cores <= 2);

// Bitrate dalam bit/detik. H.264 1080p30 di 12 Mbps sudah jauh di atas yang disimpan IG/WA setelah kompres ulang.
export const QUALITY = {
  maks:   { label: 'Maksimal (1080p, file besar)', w: 1080, h: 1920, maxFps: 60, bitrate: fps => fps > 30 ? 30e6 : 20e6, queue: 6 },
  tinggi: { label: 'Tinggi (1080p, disarankan)',   w: 1080, h: 1920, maxFps: 60, bitrate: fps => fps > 30 ? 18e6 : 12e6, queue: 6 },
  ringan: { label: 'Ringan (720p, untuk HP lambat)', w: 720, h: 1280, maxFps: 30, bitrate: () => 6e6, queue: 2 }
};
export const defaultQuality = isLowEnd ? 'ringan' : 'tinggi';

// Safari (dan semua browser di iOS) kadang mengirim 'seeked' sebelum frame siap digambar.
const ua = navigator.userAgent;
export const isWebKit = /iPhone|iPad|iPod/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua));

// Bisakah browser ini menyertakan suara di jalur per-frame? Dipakai untuk memberi tahu pengguna sebelum ekspor.
export async function audioSupported() {
  if (!window.AudioEncoder || !window.VideoEncoder) return !!window.MediaRecorder && !window.VideoEncoder;
  for (const c of [{ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }, { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }]) {
    try { if ((await AudioEncoder.isConfigSupported(c)).supported) return true; } catch {}
  }
  return false;
}
