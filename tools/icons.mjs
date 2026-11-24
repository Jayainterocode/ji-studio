// Render ikon PNG dari icon.svg. Jalankan: node tools/icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const here = new URL('.', import.meta.url), out = new URL('../public/img/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', here), 'utf8');
// maskable: isi digeser ke zona aman 80% di tengah, latar tetap penuh
const mask = svg.replace('<g id="art">', '<g id="art" transform="translate(51.2 51.2) scale(.8)">');
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, s] of [['icon-180', 180, svg], ['icon-192', 192, svg], ['icon-512', 512, svg], ['icon-maskable-512', 512, mask]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${s}`);
  await p.screenshot({ path: new URL(name + '.png', out).pathname, omitBackground: false });
}
await b.close();
