import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');

// Competitor domains whose outbound links should be unwrapped (keep anchor text).
const COMPETITORS = ['orlock\\.co\\.il', 'golfcart\\.co\\.il', 'oransystems\\.co\\.il', 'locks\\.co\\.il'];
const reList = COMPETITORS.map((d) => new RegExp(`<a [^>]*href="https?:\\/\\/(?:www\\.)?${d}[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`, 'gi'));

let files = 0, links = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.ts') || name === '_type.ts') continue;
  const fp = path.join(DIR, name);
  let s = fs.readFileSync(fp, 'utf8'); const before = s;
  for (const re of reList) s = s.replace(re, (_m, txt) => { links++; return txt; });
  if (s !== before) { fs.writeFileSync(fp, s); files++; }
}
console.log(`Unwrapped ${links} competitor links across ${files} files.`);
