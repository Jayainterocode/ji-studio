// Simpan hasil: share sheet (iOS/Android, bisa "Simpan Video") atau unduhan biasa.
export function canShareFile(blob, name) {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] })); }
  catch { return false; }
}
export async function shareFile(blob, name, title) {
  await navigator.share({ files: [new File([blob], name, { type: blob.type })], title });
}
export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const slug = s => (s || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'story';
