// Dynamic, multi-block sidebar navigation.
// Each page gets several focused nav blocks: the main service types (cross-topic),
// the cities for the page's own topic ("שירות לפי עיר"), and — for car-key pages —
// the manufacturer list. This focuses the site and strengthens internal linking.

export interface NavItem { label: string; href: string }
export interface NavGroup { key: string; title: string; items: NavItem[] }

interface PageRef { slug: string; h1?: string }

/* ---------- helpers ---------- */
function clean(slug: string): string {
  const seg = decodeURIComponent(slug).replace(/^\/+|\/+$/g, '').split('/').pop() || '';
  return seg.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}
function strip(slug: string, re: RegExp): string {
  const full = clean(slug);
  const short = full.replace(re, '').trim();
  return short && short.length >= 2 && short !== full ? short : full;
}
const byLabel = (a: NavItem, b: NavItem) => a.label.localeCompare(b.label, 'he');
const has = (pages: PageRef[], slug: string) => pages.some((p) => p.slug === slug);

/* ---------- topic patterns ---------- */
const P = {
  keyCity: (s: string) => /שכפול-מפתח(?:ות)?-לרכב-ב/.test(s) || /שכפול-מפתחות-(?:בקריות|לרכב-בראשון|לרכב-ברחובות)/.test(s),
  keyFamily: (s: string) => s.includes('שכפול-מפתח') || s === '/סוזוקי/',
  codeCity: (s: string) => /קודן-לרכב-ב/.test(s),
  code: (s: string) => s.includes('קודן'),
  locksmithCity: (s: string) => /מנעולן-ב/.test(s),
  carBreakCity: (s: string) => /פורץ-רכבים-ב/.test(s) || /^\/פורץ-רכבים\//.test(s),
  carBreak: (s: string) => s.includes('פורץ-רכבים'),
  switch: (s: string) => s.includes('סוויץ') || s === '/תיקון-מפתח-לרכב/',
  remote: (s: string) => s.includes('שלט'),
  recover: (s: string) => s.includes('שחזור-מפתח'),
  safes: (s: string) => s.includes('כספת') || s.includes('כספות'),
  lockBreak: (s: string) => s.includes('פורץ-מנעולים') || s.includes('פורץ-דלתות'),
  doors: (s: string) => s.includes('דלת') || s.includes('צילינדר') || s.includes('רב-בריח') || s.includes('מנעול'),
};

/* ---------- 1) related "service types" block (context-aware) ---------- */
// Service hubs, keyed; the related list per topic references these keys so the
// block shows only services relevant to the current page's subject.
const SVC = {
  key: { label: 'שכפול מפתחות לרכב', href: '/שכפול-מפתחות-לרכב/' },
  recover: { label: 'שחזור מפתחות לרכב', href: '/שחזור-מפתח-לרכב/' },
  code: { label: 'קודן לרכב', href: '/סוגי-קודן-לרכב/' },
  remote: { label: 'קידוד שלט לרכב', href: '/קידוד-שלט-לרכב/' },
  switch: { label: 'תיקון סוויץ׳ לרכב', href: '/תיקון-סוויץ-לרכב/' },
  carBreak: { label: 'פורץ רכבים', href: '/פורץ-רכבים/' },
  lockBreak: { label: 'פורץ מנעולים ודלתות', href: '/פורץ-דלתות/' },
  doors: { label: 'תיקון והתקנת דלתות', href: '/התקנה-ותיקון-דלתות/' },
  safes: { label: 'כספות ופריצת כספות', href: '/פורץ-כספות/' },
  price: { label: 'מחירון מנעולן', href: '/מחירון-מנעולן/' },
} as const;
type SvcKey = keyof typeof SVC;

// For each topic category, the most-related services (ordered).
const RELATED: Record<string, SvcKey[]> = {
  key: ['recover', 'remote', 'switch', 'code', 'carBreak'],
  recover: ['key', 'remote', 'code', 'carBreak', 'switch'],
  code: ['key', 'remote', 'switch', 'recover', 'carBreak'],
  remote: ['key', 'recover', 'switch', 'code'],
  switch: ['key', 'recover', 'remote', 'code'],
  carBreak: ['key', 'recover', 'code', 'remote', 'lockBreak'],
  locksmith: ['lockBreak', 'doors', 'safes', 'price', 'carBreak'],
  doors: ['lockBreak', 'safes', 'price', 'carBreak'],
  safes: ['lockBreak', 'doors', 'price', 'carBreak'],
  lockBreak: ['doors', 'safes', 'carBreak', 'price'],
};
const RELATED_FALLBACK: SvcKey[] = ['key', 'recover', 'code', 'carBreak', 'doors'];

// The topic's OWN service-type pages (non-city) — shown first in "סוגי שירותים"
// so e.g. a קודן page links to ניתוק/התקנת/תיקון/סוגי קודן etc. Only defined for
// city-based categories whose second block lists cities (not service types).
const TOPIC_SERVICE: Record<string, (s: string) => boolean> = {
  code: (s) => P.code(s) && !P.codeCity(s),
  locksmith: (s) => /מנעולן/.test(s) && !P.locksmithCity(s),
  carBreak: (s) => P.carBreak(s) && !P.carBreakCity(s),
  key: (s) => ['/שכפול-מפתחות-לרכב/', '/שחזור-מפתח-לרכב/', '/מחירון-שכפול-מפתח-לרכב-לפי-יצרן/', '/איך-לשכפל-מפתח-לרכב/'].includes(s),
};

// Extract the city token from a city-pattern slug (e.g. "חיפה", "תל-אביב").
function cityOf(slug: string): string | null {
  const pats = [
    /^\/שכפול-מפתח(?:ות)?-לרכב-ב(.+?)\/$/,
    /^\/שכפול-מפתחות-ב(.+?)\/$/,
    /^\/קודן-לרכב-ב(.+?)\/$/,
    /^\/מנעולן-ב(.+?)\/$/,
    /^\/פורץ-רכבים-ב(.+?)\/$/,
  ];
  for (const re of pats) { const m = slug.match(re); if (m && m[1].length >= 2) return m[1]; }
  return null;
}
// Which service keys have a per-city page, and how to recognise it.
const CITY_VARIANT: Partial<Record<SvcKey, (s: string) => boolean>> = {
  key: P.keyCity, code: P.codeCity, carBreak: P.carBreakCity, price: P.locksmithCity,
};

function categoryOf(s: string): string | null {
  if (P.code(s)) return 'code';
  if (P.switch(s)) return 'switch';
  if (P.remote(s)) return 'remote';
  if (P.keyFamily(s)) return 'key';
  if (P.recover(s)) return 'recover';
  if (P.locksmithCity(s)) return 'locksmith';
  if (P.carBreak(s)) return 'carBreak';
  if (P.safes(s)) return 'safes';
  if (P.lockBreak(s)) return 'lockBreak';
  if (P.doors(s)) return 'doors';
  return null;
}

/* ---------- build the ordered sidebar blocks for a page ---------- */
export function getSidebarBlocks(currentSlug: string, pages: PageRef[]): NavGroup[] {
  const blocks: NavGroup[] = [];
  const cityBlock = (key: string, title: string, match: (s: string) => boolean, stripRe: RegExp) => {
    const items = pages.filter((p) => match(p.slug)).map((p) => ({ label: strip(p.slug, stripRe), href: p.slug })).sort(byLabel);
    if (items.length > 1) blocks.push({ key, title, items });
  };

  // Related service types — only services relevant to THIS page's subject.
  // City-aware: on a city page, prefer the same service IN THE SAME CITY
  // (e.g. "קודן לרכב בחיפה") and fall back to the national hub otherwise.
  const cat = categoryOf(currentSlug);
  const city = cityOf(currentSlug);
  const seen = new Set<string>([currentSlug]);
  const serviceItems: NavItem[] = [];
  // 1) the topic's own service-type pages (e.g. all קודן services).
  const topicMatcher = cat ? TOPIC_SERVICE[cat] : undefined;
  if (topicMatcher) {
    for (const p of pages.filter((p) => topicMatcher(p.slug) && !seen.has(p.slug)).map((p) => ({ label: clean(p.slug), href: p.slug })).sort(byLabel)) {
      seen.add(p.href); serviceItems.push(p);
    }
  }
  // 2) related cross-domain services (city-aware), capped to keep the list tidy.
  const relatedKeys = (cat && RELATED[cat]) || RELATED_FALLBACK;
  for (const k of relatedKeys) {
    if (serviceItems.length >= 12) break;
    let item: NavItem | null = null;
    const variant = CITY_VARIANT[k];
    if (city && variant) {
      const cp = pages.find((p) => variant(p.slug) && p.slug.includes(city) && p.slug !== currentSlug);
      if (cp) item = { label: clean(cp.slug), href: cp.slug };
    }
    if (!item) item = SVC[k];
    if (item && has(pages, item.href) && !seen.has(item.href)) { seen.add(item.href); serviceItems.push(item); }
  }
  if (serviceItems.length) blocks.push({ key: 'services', title: 'סוגי שירותים', items: serviceItems });

  // Topic-specific blocks (a page can be in the key family AND get both city + brand lists).
  if (P.keyFamily(currentSlug) || P.recover(currentSlug)) {
    cityBlock('key-city', 'שכפול מפתח לרכב לפי עיר', P.keyCity, /^שכפול מפתח(?:ות)? לרכב ב|^שכפול מפתחות ב/);
    const brands = pages
      .filter((p) => P.keyFamily(p.slug) && !P.keyCity(p.slug))
      .map((p) => ({ label: strip(p.slug, /^שכפול מפתח(?:ות)? (?:לרכב )?ל?/), href: p.slug }))
      .sort(byLabel);
    if (brands.length > 1) blocks.push({ key: 'key-brand', title: 'שכפול מפתח לרכב לפי יצרן', items: brands });
  } else if (P.code(currentSlug)) {
    cityBlock('code-city', 'קודן לרכב לפי עיר', P.codeCity, /^קודן לרכב ב/);
  } else if (P.locksmithCity(currentSlug)) {
    cityBlock('locksmith-city', 'מנעולן לפי עיר', P.locksmithCity, /^מנעולן ב/);
  } else if (P.carBreak(currentSlug)) {
    cityBlock('carbreak-city', 'פורץ רכבים לפי עיר', P.carBreakCity, /^פורץ רכבים ב/);
  } else {
    // Non-city topics: list the topic's own pages.
    const topics: [string, string, (s: string) => boolean][] = [
      ['switch', 'סוויץ׳ ותקלות מפתח לרכב', P.switch],
      ['remote', 'שלט לרכב', P.remote],
      ['safes', 'כספות ופריצת כספות', P.safes],
      ['lock-breaker', 'פורץ מנעולים ודלתות', P.lockBreak],
      ['doors', 'דלתות, צילינדרים ומנעולים', P.doors],
    ];
    for (const [key, title, match] of topics) {
      if (match(currentSlug)) {
        const items = pages.filter((p) => match(p.slug)).map((p) => ({ label: clean(p.slug), href: p.slug })).sort(byLabel);
        if (items.length > 1) blocks.push({ key, title, items });
        break;
      }
    }
  }

  return blocks;
}
