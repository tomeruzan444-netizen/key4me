import type { APIRoute } from 'astro';
import { SITE } from '../consts';
import type { PageData } from '../data/pages/_type';

export const GET: APIRoute = () => {
  const mods = import.meta.glob('../data/pages/*.ts', { eager: true });
  const dataPages = Object.values(mods)
    .map((m: any) => m.page as PageData | undefined)
    .filter((p): p is PageData => !!p);

  const staticUrls = ['/', '/בלוג/'];
  const urls = [
    ...staticUrls.map((u) => ({ loc: u, lastmod: undefined as string | undefined })),
    ...dataPages.map((p) => ({ loc: p.slug, lastmod: p.modified ?? p.date })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => {
        const loc = new URL(u.loc, SITE.domain).href;
        const lm = u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
        return `  <url><loc>${loc}</loc>${lm}</url>`;
      })
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
