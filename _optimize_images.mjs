// One-off image optimiser for the migrated WordPress assets.
// - Brand logos used in the manufacturer slider are capped at 256px (shown ~130px).
// - All other images are capped at 1280px on the longest side.
// - Re-encodes in place, preserving format (so HTML references stay valid).
// Idempotent: withoutEnlargement means re-running never upscales.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const UPLOADS = path.join(ROOT, 'public', 'wp-content', 'uploads');
const DIST = path.join(ROOT, 'dist');

// Collect logo srcs = <img> inside .image-wrapper (the brand-grid carousel).
const logoSet = new Set();
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) scan(fp);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(fp, 'utf8');
      for (const m of html.matchAll(/class="image-wrapper"><a[^>]*><img[^>]*\ssrc="([^"]+)"/g)) {
        if (m[1].startsWith('/wp-content/uploads/')) logoSet.add(decodeURI(m[1]).replace('/wp-content/uploads/', ''));
      }
    }
  }
}
if (fs.existsSync(DIST)) scan(DIST);
console.log(`Detected ${logoSet.size} brand-logo images.`);

const exts = new Set(['.png', '.jpg', '.jpeg', '.webp']);
let count = 0, before = 0, after = 0, resized = 0;

async function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(fp); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (!exts.has(ext)) continue;

    const rel = path.relative(UPLOADS, fp).split(path.sep).join('/');
    const isLogo = logoSet.has(rel);
    const cap = isLogo ? 256 : 1000;

    const buf = fs.readFileSync(fp);
    let img = sharp(buf, { failOn: 'none' });
    let meta;
    try { meta = await img.metadata(); } catch { continue; }
    if (meta.pages && meta.pages > 1) continue; // skip animated

    const needsResize = (meta.width || 0) > cap || (meta.height || 0) > cap;
    img = sharp(buf, { failOn: 'none' });
    if (needsResize) img = img.resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true });

    if (ext === '.webp') img = img.webp({ quality: 80 });
    else if (ext === '.png') img = img.png({ compressionLevel: 9, palette: isLogo });
    else img = img.jpeg({ quality: 80, mozjpeg: true });

    let out;
    try { out = await img.toBuffer(); } catch { continue; }

    // Never write a bigger file — only keep the optimisation when it saves bytes.
    if (out.length < buf.length) {
      fs.writeFileSync(fp, out);
      before += buf.length; after += out.length; count++;
      if (needsResize) resized++;
    }
  }
}

await walk(UPLOADS);
console.log(`Optimised ${count} images (${resized} resized). ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB (saved ${Math.round((before - after) / 1024)}KB).`);
