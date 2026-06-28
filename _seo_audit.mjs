// Deep technical/SEO audit over the built site (dist/**/index.html).
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');

// Collect all built pages.
const pages = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else if (e.name === 'index.html') pages.push(fp);
  }
}
walk(DIST);

function relPath(fp) {
  let p = '/' + path.relative(DIST, path.dirname(fp)).split(path.sep).join('/');
  if (p !== '/') p += '/';
  return decodeURIComponent(p);
}

const validPaths = new Set(pages.map(relPath));
const titles = {}, descs = {}, h1s = {};
const rows = [];

const txt = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

for (const fp of pages) {
  const html = fs.readFileSync(fp, 'utf8');
  const p = relPath(fp);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || '').trim();
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] || '';
  let canonPath = '';
  try { canonPath = decodeURIComponent(new URL(canonical).pathname); } catch {}
  const h1all = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => txt(m[1]));
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  // content area only (.prose) for content checks
  const proseMatch = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>\s*<(?:div class="page-leadcta"|\/article)/i);
  const prose = proseMatch ? proseMatch[1] : html;
  const emptyHeads = (prose.match(/<h[1-6][^>]*>\s*(?:&nbsp;|\s)*<\/h[1-6]>/gi) || []).length;
  const imgs = [...prose.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((t) => !/\salt="[^"]+"/i.test(t)).length;
  const words = txt(prose).split(' ').filter(Boolean).length;
  // internal links in content
  const links = [...prose.matchAll(/href="(\/[^"#?]*)"/gi)].map((m) => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } });
  const broken = [...new Set(links)].filter((l) => {
    let n = l.endsWith('/') ? l : l + '/';
    return !validPaths.has(n) && !/\.(png|jpe?g|webp|svg|pdf|xml|ico)$/i.test(l);
  });

  (titles[title] ||= []).push(p);
  (descs[desc] ||= []).push(p);
  if (h1all[0]) (h1s[h1all[0]] ||= []).push(p);

  rows.push({ p, title, desc, canonical, canonPath, h1n: h1all.length, noindex, emptyHeads, imgsNoAlt, imgN: imgs.length, words, broken });
}

const dupTitles = Object.entries(titles).filter(([t, a]) => t && a.length > 1);
const dupDescs = Object.entries(descs).filter(([t, a]) => t && a.length > 1);
const dupH1 = Object.entries(h1s).filter(([t, a]) => t && a.length > 1);

const out = [];
out.push(`# SEO/CONTENT TECHNICAL AUDIT — ${pages.length} pages\n`);

const canonBad = rows.filter((r) => r.canonPath && r.canonPath !== r.p);
out.push(`## CANONICAL MISMATCH (points to a different URL) — ${canonBad.length}`);
canonBad.slice(0, 60).forEach((r) => out.push(`  ${r.p}\n     -> canonical: ${r.canonPath}`));

out.push(`\n## MISSING/SHORT/LONG TITLE`);
rows.filter((r) => !r.title).forEach((r) => out.push(`  [MISSING] ${r.p}`));
rows.filter((r) => r.title && (r.title.length < 25 || r.title.length > 65)).forEach((r) => out.push(`  [${r.title.length}ch] ${r.p} :: ${r.title}`));

out.push(`\n## DUPLICATE TITLES — ${dupTitles.length} groups`);
dupTitles.slice(0, 40).forEach(([t, a]) => out.push(`  "${t}" (${a.length}): ${a.slice(0, 6).join(', ')}${a.length > 6 ? ' …' : ''}`));

out.push(`\n## MISSING/SHORT/LONG DESCRIPTION`);
rows.filter((r) => !r.desc).forEach((r) => out.push(`  [MISSING] ${r.p}`));
rows.filter((r) => r.desc && (r.desc.length < 70 || r.desc.length > 165)).slice(0, 40).forEach((r) => out.push(`  [${r.desc.length}ch] ${r.p}`));

out.push(`\n## DUPLICATE DESCRIPTIONS — ${dupDescs.length} groups`);
dupDescs.slice(0, 40).forEach(([t, a]) => out.push(`  (${a.length}) ${a.slice(0, 6).join(', ')}${a.length > 6 ? ' …' : ''}\n     "${t.slice(0, 90)}…"`));

out.push(`\n## H1 ISSUES (count != 1)`);
rows.filter((r) => r.h1n !== 1).forEach((r) => out.push(`  [h1=${r.h1n}] ${r.p}`));

out.push(`\n## DUPLICATE H1 — ${dupH1.length} groups`);
dupH1.slice(0, 30).forEach(([t, a]) => out.push(`  "${t}" (${a.length})`));

out.push(`\n## EMPTY HEADINGS IN CONTENT`);
rows.filter((r) => r.emptyHeads > 0).forEach((r) => out.push(`  [${r.emptyHeads}] ${r.p}`));

out.push(`\n## IMAGES MISSING ALT (in content)`);
rows.filter((r) => r.imgsNoAlt > 0).slice(0, 60).forEach((r) => out.push(`  [${r.imgsNoAlt}/${r.imgN}] ${r.p}`));

out.push(`\n## THIN CONTENT (<300 words)`);
rows.filter((r) => r.words < 300).sort((a, b) => a.words - b.words).forEach((r) => out.push(`  [${r.words}w] ${r.p}`));

out.push(`\n## BROKEN INTERNAL LINKS`);
const brokenRows = rows.filter((r) => r.broken.length);
const allBroken = {};
brokenRows.forEach((r) => r.broken.forEach((b) => (allBroken[b] ||= []).push(r.p)));
out.push(`  unique broken targets: ${Object.keys(allBroken).length}`);
Object.entries(allBroken).sort((a, b) => b[1].length - a[1].length).slice(0, 40).forEach(([b, a]) => out.push(`  ${b}  (on ${a.length} pages)`));

out.push(`\n## NOINDEX PAGES`);
rows.filter((r) => r.noindex).forEach((r) => out.push(`  ${r.p}`));

out.push(`\n## SUMMARY`);
out.push(`  pages: ${pages.length}`);
out.push(`  canonical mismatch: ${canonBad.length}`);
out.push(`  missing title: ${rows.filter(r=>!r.title).length} | duplicate-title groups: ${dupTitles.length}`);
out.push(`  missing desc: ${rows.filter(r=>!r.desc).length} | duplicate-desc groups: ${dupDescs.length}`);
out.push(`  h1!=1: ${rows.filter(r=>r.h1n!==1).length} | dup-h1 groups: ${dupH1.length}`);
out.push(`  pages w/ empty headings: ${rows.filter(r=>r.emptyHeads>0).length}`);
out.push(`  pages w/ alt-less imgs: ${rows.filter(r=>r.imgsNoAlt>0).length}`);
out.push(`  thin (<300w): ${rows.filter(r=>r.words<300).length}`);
out.push(`  pages w/ broken links: ${brokenRows.length}`);
out.push(`  noindex: ${rows.filter(r=>r.noindex).length}`);

fs.writeFileSync(path.join(process.cwd(), '_seo_report.txt'), out.join('\n'));
console.log(out.join('\n').slice(0, 200));
console.log('\n... full report written to _seo_report.txt');
