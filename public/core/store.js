// Penyimpanan lokal per modul. Hanya untuk isian form, bukan data rahasia.
export function store(ns) {
  const key = 'ji:' + ns;
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } };
  return {
    get: (k, d) => { const v = read()[k]; return v === undefined ? d : v; },
    set: (k, v) => { try { const o = read(); o[k] = v; localStorage.setItem(key, JSON.stringify(o)); } catch {} }
  };
}
