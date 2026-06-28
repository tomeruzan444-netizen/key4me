import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');

// Collapse consecutive byte-identical <p>/<li> blocks (migration paste dupes).
const RE = /(<(p|li)\b[^>]*>([\s\S]*?)<\/\2>)(\s*)\1/g;
let files = 0, total = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.ts') || name === '_type.ts') continue;
  const fp = path.join(DIR, name);
  let s = fs.readFileSync(fp, 'utf8'); const before = s;
  let prev;
  do {
    prev = s;
    s = s.replace(RE, (m, block, tag, inner, gap) => {
      const txt = inner.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s/g, '');
      if (txt.length < 10) return m;       // keep trivial/empty repeats
      total++;
      return block + gap;                  // drop the second copy
    });
  } while (s !== prev);
  if (s !== before) { fs.writeFileSync(fp, s); files++; }
}
console.log(`Collapsed ${total} consecutive duplicate blocks across ${files} files.`);
