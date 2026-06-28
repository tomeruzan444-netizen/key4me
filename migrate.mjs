// One-shot migration: pulls every page/post from keyforme.co.il (live HTML),
// extracts content + Rank Math meta + per-group sidebar 1:1, rewrites internal
// links/images to local same-path, and emits Astro page data + sidebars.
import { parse } from 'node-html-parser';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

const DOMAIN = 'https://www.keyforme.co.il';
const ROOT = process.cwd();
const PAGES_DIR = join(ROOT, 'src/data/pages');
const PUBLIC = join(ROOT, 'public');
const CONC = 8;
const MAX = 400;
// Routes handled by custom Astro pages — never emit a data page for these.
const SKIP_PATHS = new Set(['/', '/בלוג/']);

const norm = (u) => {
  try { let p = decodeURI(new URL(u, DOMAIN).pathname); return p.endsWith('/') ? p : p + '/'; }
  catch { return u; }
};
const enc = (u) => DOMAIN + encodeURI(norm(u));
const isInternal = (h) => h && (h.startsWith(DOMAIN) || h.startsWith('/')) && !/\.(webp|jpe?g|png|gif|svg|pdf|zip|mp4)(\?|$)/i.test(h);

async function getHTML(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(enc(url), { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 migrate' } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {}
    await new Promise((res) => setTimeout(res, 600 * (i + 1)));
  }
  return null;
}

// ---- collectors ----
const images = new Set();
const sidebarsByKey = new Map(); // key -> {id, title, items}
let sbSeq = 0;
const postUrls = new Set();

function fixImg(el) {
  let real = el.getAttribute('data-lazy-src') || el.getAttribute('data-src') || el.getAttribute('src') || '';
  if (real.startsWith('data:')) real = el.getAttribute('data-lazy-src') || el.getAttribute('data-src') || '';
  if (!real) return;
  let local = real;
  if (real.startsWith(DOMAIN)) local = decodeURI(real.slice(DOMAIN.length));
  else if (real.startsWith('/')) local = decodeURI(real);
  if (local.startsWith('/wp-content')) images.add(local);
  el.setAttribute('src', local);
  el.removeAttribute('data-lazy-src'); el.removeAttribute('data-src');
  el.removeAttribute('srcset'); el.removeAttribute('data-lazy-srcset'); el.removeAttribute('sizes');
  el.setAttribute('loading', 'lazy');
}

function rewriteLinks(rootEl, foundLinks) {
  rootEl.querySelectorAll('a[href]').forEach((a) => {
    let h = a.getAttribute('href');
    if (!h) return;
    if (h.startsWith(DOMAIN)) { const p = decodeURI(h.slice(DOMAIN.length)) || '/'; a.setAttribute('href', p); h = p; }
    if (isInternal(h) && h.startsWith('/')) foundLinks.push(norm(h));
    a.removeAttribute('data-wpel-link'); a.removeAttribute('target');
  });
}

function prettify(seg) { return decodeURIComponent(seg).replace(/-/g, ' ').trim(); }

function sidebarTitle(items) {
  const txt = items.map((i) => i.label).join(' ');
  if (/קודן/.test(txt)) return 'מאמרי קודן לרכב';
  if (/שכפול מפתח/.test(txt)) return 'שכפול מפתח לפי יצרן';
  if (/ממ.?ד|דלת/.test(txt)) return 'דלתות ומנעולים';
  if (/שחזור|שלט/.test(txt)) return 'מפתחות ושלטים לרכב';
  return 'מומלצים לקריאה';
}

function registerSidebar(items) {
  if (!items.length) return undefined;
  const key = items.map((i) => i.href).join('|');
  if (sidebarsByKey.has(key)) return sidebarsByKey.get(key).id;
  const id = 'sb-' + (++sbSeq);
  sidebarsByKey.set(key, { id, title: sidebarTitle(items), items });
  return id;
}

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${'); }

function tsLiteral(v) {
  if (v === undefined) return 'undefined';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return '[' + v.map(tsLiteral).join(', ') + ']';
  if (typeof v === 'object') return '{ ' + Object.entries(v).map(([k, val]) => `${JSON.stringify(k)}: ${tsLiteral(val)}`).join(', ') + ' }';
  return '`' + esc(String(v)) + '`';
}

const results = [];

async function processUrl(url, isPost) {
  const path = norm(url);
  const html = await getHTML(url);
  if (!html) { console.log('SKIP (no html):', path); return []; }
  const root = parse(html, { blockTextElements: { script: false, style: false } });

  const body = root.querySelector('body');
  const bclass = body?.getAttribute('class') || '';
  let id = (bclass.match(/\bpostid-(\d+)\b/) || bclass.match(/\bpage-id-(\d+)\b/) || [])[1];
  const kind = isPost || /\bpostid-\d+\b/.test(bclass) ? 'article' : 'service';

  const getMeta = (sel, attr = 'content') => root.querySelector(sel)?.getAttribute(attr) || undefined;
  const metaTitle = (root.querySelector('title')?.text || '').trim() || undefined;
  const metaDesc = getMeta('meta[name="description"]');
  const canonical = getMeta('link[rel="canonical"]', 'href') || DOMAIN + encodeURI(path);
  const ogImageRaw = getMeta('meta[property="og:image"]');
  const robots = getMeta('meta[name="robots"]') || '';
  const noindex = /noindex/i.test(robots);
  const date = getMeta('meta[property="article:published_time"]');
  const modified = getMeta('meta[property="article:modified_time"]');

  const ec = root.querySelector('.entry-content') || root.querySelector('.dpz-content') || root.querySelector('article .inside-article');
  if (!ec) { console.log('SKIP (no content):', path); return []; }

  // H1
  let h1 = (root.querySelector('h1')?.text || '').trim();
  if (!h1) h1 = (metaTitle || '').split(/[-|]/)[0].trim();

  // Clean content
  ec.querySelectorAll('script,style,noscript,.dpz-left-sidebar,.dpz-right-sidebar').forEach((n) => n.remove());
  ec.querySelectorAll('img').forEach(fixImg);
  const foundLinks = [];
  rewriteLinks(ec, foundLinks);
  // drop a leading heading that duplicates the H1
  const firstHeading = ec.querySelector('h1,h2');
  if (firstHeading && firstHeading.text.trim().replace(/\s+/g, ' ') === h1.replace(/\s+/g, ' ')) firstHeading.remove();
  let content = ec.innerHTML.trim();

  // hero image
  let heroImage;
  if (ogImageRaw && ogImageRaw.startsWith(DOMAIN)) { heroImage = decodeURI(ogImageRaw.slice(DOMAIN.length)); if (heroImage.startsWith('/wp-content')) images.add(heroImage); }
  if (!heroImage) heroImage = '/wp-content/uploads/2025/05/newkeybannerimg-1.webp';

  // sidebar (per-group menu)
  const sbEl = root.querySelector('.dpz-left-sidebar, .dpz-right-sidebar, #secondary, .widget-area');
  let sidebar;
  if (sbEl) {
    const items = [];
    const seen = new Set();
    sbEl.querySelectorAll('a[href]').forEach((a) => {
      let h = a.getAttribute('href') || '';
      if (h.startsWith(DOMAIN)) h = decodeURI(h.slice(DOMAIN.length));
      const label = a.text.trim().replace(/\s+/g, ' ');
      if (!label || !h.startsWith('/') || h === '#' || !isInternal(h) || seen.has(h)) return;
      seen.add(h); items.push({ label, href: norm(h) });
    });
    sidebar = registerSidebar(items.slice(0, 30));
  }

  // breadcrumbs
  const segs = path.replace(/^\/|\/$/g, '').split('/');
  let breadcrumbs;
  if (kind === 'article') breadcrumbs = [{ label: 'בלוג', href: '/בלוג/' }, { label: h1 }];
  else if (segs.length >= 2) breadcrumbs = [{ label: prettify(segs[0]), href: '/' + segs[0] + '/' }, { label: h1 }];
  else breadcrumbs = [{ label: h1 }];

  if (!id) id = 'p' + Math.abs([...path].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));

  results.push({ id, path, kind, metaTitle, metaDesc, canonical, h1, heroImage, sidebar, breadcrumbs, date, modified, noindex, content, excerpt: (metaDesc || '').slice(0, 160) });
  if (isPost) postUrls.add(path);
  console.log(`OK ${kind} ${path}  (sb:${sidebar || '-'}, img in content)`);
  return foundLinks;
}

// ---- main ----
(async () => {
  // seed from sitemaps
  const seed = new Map(); // path -> isPost
  for (const sm of ['post-sitemap.xml', 'page-sitemap.xml']) {
    const xml = await (await fetch(`${DOMAIN}/${sm}`)).text();
    const isPost = sm.startsWith('post');
    for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) seed.set(norm(m[1]), isPost);
  }
  // extra URLs (pages not in the sitemap but present in the DB) — full coverage
  if (existsSync(join(ROOT, 'extra-urls.txt'))) {
    for (const line of readFileSync(join(ROOT, 'extra-urls.txt'), 'utf8').split(/\r?\n/)) {
      const p = line.trim(); if (p && p.startsWith('/')) seed.set(norm(p), false);
    }
  }
  console.log('Seed URLs:', seed.size);

  const queued = new Map([...seed]); // path -> isPost
  const visited = new Set();
  let frontier = [...seed.entries()];

  while (frontier.length && visited.size < MAX) {
    const batch = frontier.splice(0, CONC);
    const linksArr = await Promise.all(batch.map(async ([p, isPost]) => {
      if (visited.has(p) || SKIP_PATHS.has(p)) return [];
      visited.add(p);
      try { return await processUrl(DOMAIN + p, isPost); } catch (e) { console.log('ERR', p, e.message); return []; }
    }));
    for (const links of linksArr) for (const l of links) {
      if (!queued.has(l) && !SKIP_PATHS.has(l) && isInternal(l)) { queued.set(l, false); frontier.push([l, false]); }
    }
  }

  console.log(`\nProcessed ${results.length} pages. Unique images: ${images.size}. Sidebars: ${sidebarsByKey.size}`);

  // write page data files
  mkdirSync(PAGES_DIR, { recursive: true });
  const idsSeen = new Set();
  for (const r of results) {
    let fid = String(r.id);
    while (idsSeen.has(fid)) fid += '_';
    idsSeen.add(fid);
    const obj = {
      id: /^\d+$/.test(String(r.id)) ? Number(r.id) : 0,
      slug: r.path, kind: r.kind, metaTitle: r.metaTitle, metaDesc: r.metaDesc,
      canonical: r.canonical, h1: r.h1, heroImage: r.heroImage, heroAlt: r.h1,
      sidebar: r.sidebar, breadcrumbs: r.breadcrumbs, date: r.date, modified: r.modified,
      noindex: r.noindex, content: r.content,
    };
    const lines = Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => `  ${k}: ${tsLiteral(v)},`);
    const out = `import type { PageData } from './_type';\n\nexport const page: PageData = {\n${lines.join('\n')}\n};\n`;
    writeFileSync(join(PAGES_DIR, fid + '.ts'), out, 'utf8');
  }

  // sidebars.ts
  const sbObj = {};
  for (const { id, title, items } of sidebarsByKey.values()) sbObj[id] = { title, items };
  const sbOut =
    `// Auto-generated from the live site — per-group sidebars (1:1 with the WP menus).\n` +
    `export type SidebarItem = { label: string; href: string };\n` +
    `export type Sidebar = { title: string; items: SidebarItem[] };\n\n` +
    `export const SIDEBARS: Record<string, Sidebar> = ${JSON.stringify(sbObj, null, 2)};\n\n` +
    `export function getSidebar(id?: string): Sidebar | null { return id ? (SIDEBARS[id] ?? null) : null; }\n`;
  writeFileSync(join(ROOT, 'src/data/sidebars.ts'), sbOut, 'utf8');

  // posts index for /בלוג/
  const posts = results.filter((r) => r.kind === 'article').map((r) => ({
    title: r.h1, href: r.path, img: r.heroImage, excerpt: r.excerpt, date: r.date,
  })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  writeFileSync(join(ROOT, 'src/data/posts-index.json'), JSON.stringify(posts, null, 2), 'utf8');

  // image manifest
  writeFileSync(join(ROOT, 'image-manifest.json'), JSON.stringify([...images], null, 2), 'utf8');
  console.log('Wrote data files, sidebars, posts-index, image-manifest.');
})();
