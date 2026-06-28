// Replace long dashes (em — / en –, incl. HTML entities) with a plain hyphen "-"
// across all site content. A pre-scan confirmed no long dash appears inside any
// href/src; as defence-in-depth this also skips slug:/canonical: route lines.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dirs = ['src/data/pages', 'src/components', 'src/pages', 'src/layouts'];
const extraFiles = ['src/consts.ts', 'src/data/sidebars.ts', 'src/data/posts-index.json', 'src/styles/global.css'];

const LONG_DASHES = /[–—‒―]|&#8211;|&#8212;|&#x2013;|&#x2014;|&ndash;|&mdash;/gi;

function safeReplace(text) {
  let count = 0;
  const out = text
    .split('\n')
    .map((line) => {
      if (/^\s*(slug|canonical)\s*:/.test(line)) return line; // never touch route/URL lines
      return line.replace(LONG_DASHES, () => { count++; return '-'; });
    })
    .join('\n');
  return { out, count };
}

function collect() {
  const files = [];
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (/\.(ts|astro)$/.test(name)) files.push(path.join(abs, name));
    }
  }
  for (const f of extraFiles) { const a = path.join(ROOT, f); if (fs.existsSync(a)) files.push(a); }
  return files;
}

let totalFiles = 0, totalReps = 0;
for (const fp of collect()) {
  const src = fs.readFileSync(fp, 'utf8');
  const { out, count } = safeReplace(src);
  if (count > 0) { fs.writeFileSync(fp, out); totalFiles++; totalReps += count; }
}
console.log(`Replaced ${totalReps} long dashes across ${totalFiles} files.`);
