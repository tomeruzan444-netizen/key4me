import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');
const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const wr = (f, s) => fs.writeFileSync(path.join(DIR, f), s);

// 1) noindex the redundant duplicate-content variants (keep the primary URL).
const dupes = ['270_.ts', '273.ts', '301_.ts', '259_.ts', '6712_.ts', '326.ts', '10034.ts'];
let ni = 0;
for (const f of dupes) {
  let s = rd(f);
  if (/noindex:\s*false/.test(s)) { s = s.replace(/noindex:\s*false/, 'noindex: true'); wr(f, s); ni++; }
  else if (/noindex:\s*true/.test(s)) { /* already */ }
  else console.log('  ! no noindex field in ' + f);
}
console.log(`noindex set on ${ni} duplicate pages.`);

// 2) Fix reversed (descending) numeric price ranges in flagged tables: "600 - 300" -> "300 - 600".
const priceFiles = ['8379.ts', '595.ts', '203.ts', '3514.ts', '3058.ts', '36402.ts'];
let swaps = 0;
for (const f of priceFiles) {
  let s = rd(f);
  s = s.replace(/(\d{2,4}) - (\d{2,4})/g, (m, a, b) => {
    if (+a > +b) { swaps++; return `${b} - ${a}`; }
    return m;
  });
  wr(f, s);
}
console.log(`Swapped ${swaps} reversed price ranges.`);

// 3) Collapse immediately-repeated identical paragraphs across all files.
let dpFiles = 0, dpCount = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.ts') || name === '_type.ts') continue;
  let s = rd(name); const before = s;
  s = s.replace(/(<p>[\s\S]{25,}?<\/p>)(\s*)\1/g, (_m, p) => { dpCount++; return p; });
  if (s !== before) { wr(name, s); dpFiles++; }
}
console.log(`Removed ${dpCount} consecutive duplicate paragraphs across ${dpFiles} files.`);
