// Convert the heavy steel-door PNG photos to WebP, update references, drop PNGs.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'public', 'wp-content', 'uploads', '2025', '10');
const PAGES = path.join(ROOT, 'src', 'data', 'pages');
const names = ['דלת-פלדלת-מעוצבת-2', 'דלת-פלדלת-מעוצבת', 'דלת-פלדלת', 'דלת'];

let saved = 0;
for (const n of names) {
  const png = path.join(DIR, n + '.png');
  const webp = path.join(DIR, n + '.webp');
  if (!fs.existsSync(png)) { console.log('missing', n); continue; }
  const before = fs.statSync(png).size;
  await sharp(png).resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(webp);
  const after = fs.statSync(webp).size;
  saved += before - after;
  fs.unlinkSync(png);
  console.log(`${n}: ${Math.round(before / 1024)}KB png -> ${Math.round(after / 1024)}KB webp`);
}

// Update references in the data pages (.png -> .webp for these exact paths).
let edited = 0;
for (const f of fs.readdirSync(PAGES)) {
  if (!f.endsWith('.ts')) continue;
  const fp = path.join(PAGES, f);
  let s = fs.readFileSync(fp, 'utf8');
  let changed = false;
  for (const n of names) {
    const from = `/wp-content/uploads/2025/10/${n}.png`;
    const to = `/wp-content/uploads/2025/10/${n}.webp`;
    if (s.includes(from)) { s = s.split(from).join(to); changed = true; }
  }
  if (changed) { fs.writeFileSync(fp, s); edited++; }
}
console.log(`Updated ${edited} data files. Total saved: ${Math.round(saved / 1024)}KB`);
