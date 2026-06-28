// Cold-load test: fetch a page + all its assets from the preview server,
// report total transferred bytes and wall-clock time.
const base = 'http://localhost:8080';
const page = process.argv[2] || '/שכפול-מפתחות-לרכב/';

const t0 = Date.now();
const html = await (await fetch(base + encodeURI(page))).text();
const urls = new Set();
for (const m of html.matchAll(/(?:src|href)="([^"]+\.(?:webp|png|jpe?g|gif|css|js|woff2?))(?:\?[^"]*)?"/gi)) {
  let u = m[1];
  if (u.startsWith('//')) continue;
  if (u.startsWith('http')) { if (!u.includes('localhost')) continue; }
  else u = base + encodeURI(u);
  urls.add(u);
}
let bytes = html.length, n = 1;
await Promise.all([...urls].map(async (u) => {
  try { const r = await fetch(u); const b = await r.arrayBuffer(); bytes += b.byteLength; n++; } catch {}
}));
const ms = Date.now() - t0;
console.log(`${page}\n  assets: ${n} | total: ${(bytes / 1024).toFixed(0)} KB | time: ${ms} ms`);
