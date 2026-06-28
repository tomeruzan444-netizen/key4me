import fs from 'node:fs';
import path from 'node:path';
const DIR = path.join(process.cwd(), 'src/data/pages');
const MAX = 158;

function trim(desc) {
  if (desc.length <= 165) return desc;
  let t = desc.slice(0, MAX);
  // prefer a sentence end within the window
  const lastStop = Math.max(t.lastIndexOf('. '), t.lastIndexOf('! '), t.lastIndexOf('? '), t.lastIndexOf('.'), t.lastIndexOf('!'));
  if (lastStop >= 90) return t.slice(0, lastStop + 1).trim();
  // else cut at last comma or space, drop trailing punctuation
  const lastComma = t.lastIndexOf(', ');
  if (lastComma >= 90) return t.slice(0, lastComma).trim();
  const lastSpace = t.lastIndexOf(' ');
  return t.slice(0, lastSpace).replace(/[,\s]+$/, '').trim();
}

let files = 0, trimmed = 0;
for (const name of fs.readdirSync(DIR)) {
  if (!name.endsWith('.ts') || name === '_type.ts') continue;
  const fp = path.join(DIR, name);
  let s = fs.readFileSync(fp, 'utf8');
  const m = s.match(/metaDesc:\s*`([^`]*)`/);
  if (!m) continue;
  const orig = m[1];
  if (orig.length <= 165) continue;
  const t = trim(orig);
  if (t !== orig && t.length >= 60) {
    s = s.replace(/metaDesc:\s*`[^`]*`/, 'metaDesc: `' + t + '`');
    fs.writeFileSync(fp, s); files++; trimmed++;
  }
}
console.log(`Trimmed ${trimmed} long meta descriptions across ${files} files.`);
