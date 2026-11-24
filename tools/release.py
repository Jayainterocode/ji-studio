#!/usr/bin/env python3
"""Siapkan rilis JI Studio untuk Hostinger.

1. Tulis daftar aset + versi (hash isi) ke public/sw.js, jadi versi cache tidak mungkin lupa dinaikkan.
2. Cek anggaran ukuran (gzip) tiap file dan total kunjungan pertama.
3. Buat dist/ji-studio.zip berisi isi folder public/ (termasuk .htaccess), siap diekstrak di public_html.

Jalankan: python3 tools/release.py
"""
import gzip, hashlib, io, json, re, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
DIST = ROOT / "dist"

# Batas ukuran setelah gzip (byte). Aset biner (woff2, png) sudah terkompres, diukur apa adanya.
BUDGET_FILE = {".html": 6_000, ".js": 12_000, ".css": 5_000, ".webmanifest": 1_000, ".woff2": 45_000, ".png": 20_000}
BUDGET_TOTAL = 150_000
NOT_CACHED = {"sw.js", ".htaccess"}


def gz(b: bytes) -> int:
    return len(gzip.compress(b, 9))


def main() -> int:
    files = sorted(p for p in PUB.rglob("*") if p.is_file())
    rel = [p.relative_to(PUB).as_posix() for p in files]

    # 1. aset + versi
    assets = []
    for r in rel:
        if r in NOT_CACHED:
            continue
        if r.endswith("index.html"):
            d = r[: -len("index.html")]
            assets.append("./" + d)
        assets.append("./" + r)
    h = hashlib.sha256()
    for p, r in zip(files, rel):
        if r == "sw.js":
            continue
        h.update(r.encode()); h.update(p.read_bytes())
    version = h.hexdigest()[:10]
    sw = PUB / "sw.js"
    s = sw.read_text()
    s = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", s)
    s = re.sub(r"const ASSETS = \[.*?\];", "const ASSETS = " + json.dumps(assets).replace('"', "'").replace("','", "', '") + ";", s, flags=re.S)
    sw.write_text(s)

    # 2. anggaran ukuran
    ok, total = True, 0
    print(f"{'file':42} {'gzip':>8}  batas")
    for p, r in zip(files, rel):
        raw = p.read_bytes()
        size = len(raw) if p.suffix in (".woff2", ".png") else gz(raw)
        lim = BUDGET_FILE.get(p.suffix)
        if r != ".htaccess":
            total += size
        flag = ""
        if lim and size > lim:
            ok, flag = False, "  << MELEBIHI"
        print(f"{r:42} {size:>8}  {lim or '-'}{flag}")
    print(f"{'TOTAL (semua aset)':42} {total:>8}  {BUDGET_TOTAL}")
    if total > BUDGET_TOTAL:
        ok = False
        print("<< total melebihi anggaran")

    # 3. zip untuk Hostinger
    DIST.mkdir(exist_ok=True)
    out = DIST / "ji-studio.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p, r in zip(files, rel):
            z.write(p, r)
    print(f"\nversi cache: ji-{version}\nzip: {out.relative_to(ROOT)} ({out.stat().st_size} byte)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
