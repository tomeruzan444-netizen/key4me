// Quick per-page weight audit: counts <img>, sums referenced asset bytes.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const pages = [
  'שכפול-מפתחות-לרכב/index.html',
  'מחירון-שכפול-מפתח-לרכב-לפי-יצרן/index.html',
  'index.html',
];

function sizeOf(rel) {
  try { return fs.statSync(path.join(DIST, rel.replace(/^\//, ''))).size; } catch { return 0; }
}

for (const p of pages) {
  const html = fs.readFileSync(path.join(DIST, p), 'utf8');
  const imgs = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const uniq = [...new Set(imgs)].filter((s) => s.startsWith('/wp-content'));
  let total = 0;
  const big = [];
  for (const s of uniq) {
    const b = sizeOf(s);
    total += b;
    if (b > 40_000) big.push(`${Math.round(b / 1024)}KB ${s}`);
  }
  const css = [...html.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map((m) => m[1]);
  let cssBytes = 0;
  for (const c of css) cssBytes += sizeOf(c);
  const lazy = (html.match(/loading="lazy"/g) || []).length;
  const eager = imgs.length - lazy;
  console.log(`\n=== ${p} ===`);
  console.log(`HTML: ${Math.round(html.length / 1024)}KB | imgs: ${imgs.length} (lazy ${lazy}/eager ${eager}) | unique asset img bytes: ${Math.round(total / 1024)}KB | CSS: ${Math.round(cssBytes / 1024)}KB across ${css.length} files`);
  if (big.length) console.log('  images >40KB:\n   ' + big.join('\n   '));
}
