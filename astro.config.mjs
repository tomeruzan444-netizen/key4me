import { defineConfig } from 'astro/config';

// Static, ultra-fast build. Same domain as the existing site so all
// internal links and /wp-content/uploads image paths stay 1:1.
export default defineConfig({
  site: 'https://www.keyforme.co.il',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
