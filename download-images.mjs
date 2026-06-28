// Downloads every image referenced by the migrated pages into /public,
// preserving the exact /wp-content/uploads/... path. Skips existing files.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const DOMAIN = 'https://www.keyforme.co.il';
const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const list = JSON.parse(readFileSync(join(ROOT, 'image-manifest.json'), 'utf8'));
const CONC = 10;

async function dl(rel) {
  const dest = join(PUBLIC, rel.replace(/\//g, '\\'));
  if (existsSync(dest)) return 'skip';
  const url = DOMAIN + encodeURI(rel);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return 'fail ' + r.status;
    const buf = Buffer.from(await r.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    return 'ok';
  } catch (e) { return 'err ' + e.message; }
}

let ok = 0, skip = 0, fail = 0;
const failed = [];
for (let i = 0; i < list.length; i += CONC) {
  const batch = list.slice(i, i + CONC);
  const res = await Promise.all(batch.map(dl));
  res.forEach((r, j) => {
    if (r === 'ok') ok++; else if (r === 'skip') skip++; else { fail++; failed.push(batch[j] + ' → ' + r); }
  });
}
console.log(`Images — ok:${ok} skip:${skip} fail:${fail} / total:${list.length}`);
if (failed.length) console.log('FAILED:\n' + failed.join('\n'));
