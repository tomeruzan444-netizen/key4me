// Restore original images from the live site, overwriting local copies.
// Only overwrites when the download succeeds, so a 404 never deletes a file.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const DOMAIN = 'https://www.keyforme.co.il';
const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const list = JSON.parse(readFileSync(join(ROOT, 'image-manifest.json'), 'utf8'));
const CONC = 10;

async function dl(rel) {
  const dest = join(PUBLIC, rel.replace(/\//g, '\\'));
  const url = DOMAIN + encodeURI(rel);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return existsSync(dest) ? 'kept(' + r.status + ')' : 'missing(' + r.status + ')';
    const buf = Buffer.from(await r.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    return 'ok';
  } catch (e) { return 'err ' + e.message; }
}

let ok = 0, kept = 0, miss = 0;
const probs = [];
for (let i = 0; i < list.length; i += CONC) {
  const res = await Promise.all(list.slice(i, i + CONC).map(dl));
  res.forEach((r, j) => {
    if (r === 'ok') ok++;
    else if (r.startsWith('kept')) { kept++; }
    else { miss++; probs.push(list[i + j] + ' -> ' + r); }
  });
}
console.log(`Restore — overwritten:${ok} kept-on-fail:${kept} missing:${miss} / total:${list.length}`);
if (probs.length) console.log('PROBLEMS:\n' + probs.join('\n'));
