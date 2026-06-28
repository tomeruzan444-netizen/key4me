// Utilities for porting WordPress HTML content into the new site 1:1.
import { SITE } from '../consts';

const DOMAIN_RE = /https?:\/\/(?:www\.)?keyforme\.co\.il(\/[^"'\s)]*)?/gi;
// WP shortcodes that have no direct render target in the static site.
const SHORTCODE_RE = /\[\/?(SMCC-table-content|faq_widget|qw_image|qw_grid|qw_video|wp_menu|smartslider3|elementor-template|trustindex)[^\]]*\]/gi;
// Junk attributes/ids left over from the WP/AI-paste migration. They do nothing
// in the static site and only bloat the HTML, so strip them at render time.
const CRUFT_ATTR_RE = /\s(?:data-rocket-location-hash|data-sourcepos|data-path-to-node|data-test-render-count|data-is-streaming|data-rocket-[\w-]+|data-wpr-[\w-]+)="[^"]*"/gi;
const CRUFT_ID_RE = /\sid="(?:model-response-message-content|markdown-content)[^"]*"/gi;
// Class attributes from the AI-paste migration (Claude/markdown wrappers). Inert
// in the static site (no Tailwind), so drop the whole attribute to de-bloat.
const CRUFT_CLASS_RE = /\sclass="[^"]*(?:font-claude-response|standard-markdown|progressive-markdown|markdown-content|grid-cols-1 grid|group relative)[^"]*"/gi;

// Matches the migrated interactive price-quiz block (its <script> never ran under
// set:html, so the original was dead/broken). Replaced with a styled rebuild.
const QUIZ_RE = /<div class="quiz-container[^"]*">[\s\S]*?<\/div>\s*<\/body>/i;
const QUIZ_HTML = `<div class="kfm-quiz" data-kfm-quiz>
  <div class="kfm-quiz__head">
    <span class="kfm-quiz__badge">מחשבון מחיר מהיר</span>
    <h3 class="kfm-quiz__title">כמה יעלה לכם? קבלו הערכת מחיר ב-4 שאלות</h3>
    <div class="kfm-quiz__bar"><span class="kfm-quiz__bar-fill" style="width:25%"></span></div>
    <p class="kfm-quiz__count">שאלה <span data-quiz-step>1</span> מתוך 4</p>
  </div>
  <div class="kfm-quiz__body">
    <div class="kfm-quiz__step" data-step="1">
      <p class="kfm-quiz__q">מה סוג השירות שאתם צריכים?</p>
      <div class="kfm-quiz__opts">
        <button type="button" class="kfm-quiz__opt" data-q="service" data-v="dup">שכפול מפתח לרכב</button>
        <button type="button" class="kfm-quiz__opt" data-q="service" data-v="rec">שחזור מפתח לרכב</button>
      </div>
    </div>
    <div class="kfm-quiz__step" data-step="2" hidden>
      <p class="kfm-quiz__q">איזה מפתח אתם צריכים?</p>
      <div class="kfm-quiz__opts">
        <button type="button" class="kfm-quiz__opt" data-q="key" data-v="smart">מפתח עם שלט / חכם</button>
        <button type="button" class="kfm-quiz__opt" data-q="key" data-v="reg">מפתח רגיל</button>
      </div>
    </div>
    <div class="kfm-quiz__step" data-step="3" hidden>
      <p class="kfm-quiz__q">האם הרכב גרמני או רכב יוקרה?</p>
      <div class="kfm-quiz__opts">
        <button type="button" class="kfm-quiz__opt" data-q="german" data-v="yes">כן</button>
        <button type="button" class="kfm-quiz__opt" data-q="german" data-v="no">לא</button>
      </div>
    </div>
    <div class="kfm-quiz__step" data-step="4" hidden>
      <p class="kfm-quiz__q">מאיזה אזור בארץ אתם?</p>
      <div class="kfm-quiz__opts">
        <button type="button" class="kfm-quiz__opt" data-q="region" data-v="south">דרום</button>
        <button type="button" class="kfm-quiz__opt" data-q="region" data-v="center">מרכז</button>
        <button type="button" class="kfm-quiz__opt" data-q="region" data-v="north">צפון</button>
      </div>
    </div>
  </div>
  <div class="kfm-quiz__result" hidden>
    <span class="kfm-quiz__result-label">הערכת מחיר משוערת</span>
    <div class="kfm-quiz__price" data-quiz-price>-</div>
    <p class="kfm-quiz__note">זוהי הערכה גסה בלבד - המחיר המדויק תלוי בדגם הרכב, בשנתון ובמצב. לקבלת הצעת מחיר מדויקת וללא התחייבות, דברו איתנו עכשיו:</p>
    <div class="kfm-quiz__cta">
      <a class="btn btn--primary btn--lg" href="tel:${SITE.phoneMobileIntl}">חייגו · ${SITE.phoneMobile}</a>
      <a class="btn btn--navy btn--lg" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">שלחו וואטסאפ</a>
    </div>
    <button type="button" class="kfm-quiz__restart" data-quiz-restart>התחל מחדש ↺</button>
  </div>
  <button type="button" class="kfm-quiz__back" data-quiz-back hidden>‹ חזרה לשאלה הקודמת</button>
</div>`;

/**
 * Rewrites internal absolute keyforme.co.il links/images to clean relative
 * paths (decoded Hebrew), strips unrenderable shortcodes, and keeps the rest
 * of the markup identical. Image paths stay under /wp-content/uploads/... so
 * they resolve against the locally-migrated assets.
 */
export function processContent(html: string): string {
  if (!html) return '';
  let out = html.replace(DOMAIN_RE, (_m, path) => {
    if (!path) return '/';
    try { return decodeURI(path); } catch { return path; }
  });
  out = out.replace(SHORTCODE_RE, '');
  // Strip migration/AI-paste junk attributes & ids, and stray ";" paragraphs.
  out = out.replace(CRUFT_ATTR_RE, '');
  out = out.replace(CRUFT_ID_RE, '');
  out = out.replace(CRUFT_CLASS_RE, '');
  out = out.replace(/<p>\s*;\s*<\/p>/gi, '');
  // Remove the empty migrated table-of-contents placeholder (we render our own).
  out = out.replace(/<div class="custom-toc-wrapper"[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>/i, '');
  // Replace the broken interactive price quiz with a styled, working rebuild.
  // Runs before the structure-tag strip because it uses the trailing </body>
  // (a migration artifact) as the block's end landmark.
  out = out.replace(QUIZ_RE, QUIZ_HTML);
  // Strip stray document-structure tags that leaked in during migration (e.g. an
  // embedded quiz wrapped in its own <head>/<body>). A misplaced </body> mid-page
  // truncates the DOM and breaks layout (notably on mobile), so remove them.
  out = out.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
  out = out.replace(/<\/?(?:html|body)\b[^>]*>/gi, '');
  // Demote any in-content <h1> to <h2>: the page's single real <h1> is the hero
  // heading, so a second <h1> in the body hurts SEO (duplicate H1).
  out = out.replace(/<(\/?)h1(\b[^>]*)>/gi, '<$1h2$2>');
  // Strip empty headings left by the migration (e.g. <h2></h2>, <h3>&nbsp;</h3>).
  out = out.replace(/<(h[1-6])\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, '');
  // Turn migrated FAQ blocks into native <details> accordions (answer hidden
  // until the question is clicked). Runs before the table wrap so a table inside
  // an answer can't confuse the closing-tag match.
  out = out.replace(
    /<div class="faq-item">\s*<h4 class="faq-question">([\s\S]*?)<\/h4>\s*<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/div>/gi,
    '<details class="faq-item"><summary class="faq-question"><span>$1</span>' +
      '<svg class="faq-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</summary><div class="faq-answer">$2</div></details>'
  );
  // Wrap tables in a horizontal-scroll container so wide pricing tables scroll
  // inside their own box instead of forcing the whole page wider than the
  // viewport (which caused right/left page scrolling on mobile).
  out = out.replace(/<table(\s|>)/gi, '<div class="table-scroll"><table$1');
  out = out.replace(/<\/table>/gi, '</table></div>');
  // Add descriptive alt text (from the image filename) to images that lack it.
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\salt="[^"]+"/i.test(tag)) return tag; // already has a non-empty alt
    const src = tag.match(/\ssrc="([^"]+)"/i)?.[1] || '';
    let base = src.split('/').pop() || '';
    try { base = decodeURIComponent(base); } catch {}
    base = base.replace(/\.[a-z0-9]+$/i, '').replace(/-\d+x\d+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    // Only use a filename-derived alt when it is actually descriptive
    // (contains Hebrew or a real word) — skip hashes/random names.
    if (!/[֐-׿]/.test(base) && !/[a-zA-Z]{4,}/.test(base)) return tag;
    const t = tag.replace(/\salt="[^"]*"/i, '');
    return t.replace(/<img/i, `<img alt="${base.replace(/"/g, '')}"`);
  });
  // Normalise stray double blank lines left by stripped shortcodes
  out = out.replace(/(\r?\n\s*){3,}/g, '\n\n');
  return out;
}

/** Decode a %-encoded WP permalink path to a clean leading-slash path. */
export function toLocalPath(permalink: string): string {
  try {
    const u = new URL(permalink);
    return decodeURI(u.pathname);
  } catch {
    try { return decodeURI(permalink); } catch { return permalink; }
  }
}

/** Estimate reading time (Hebrew ~ 200 wpm) for blog posts. */
export function readingTime(html: string): number {
  const words = (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
  return Math.max(1, Math.round(words / 200));
}

export interface TocEntry { id: string; text: string; level: number }

function slugify(text: string): string {
  return text
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[^֐-׿0-9a-zA-Z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'sec';
}

/**
 * Adds stable `id` anchors to the content's <h2>/<h3> headings and returns the
 * matching table-of-contents entries (for a collapsible TOC at the top of pages).
 */
export function addHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const used = new Set<string>();
  const toc: TocEntry[] = [];
  // Only <h2> headings appear in the table of contents.
  const out = html.replace(/<(h2)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return m;
    let id = (attrs.match(/\sid="([^"]+)"/) || [])[1] || '';
    if (!id) {
      const base = 'sec-' + slugify(text);
      id = base;
      let i = 2;
      while (used.has(id)) id = `${base}-${i++}`;
      attrs = `${attrs} id="${id}"`;
    }
    used.add(id);
    toc.push({ id, text, level: 2 });
    return `<${tag}${attrs}>${inner}</${tag}>`;
  });
  return { html: out, toc };
}
