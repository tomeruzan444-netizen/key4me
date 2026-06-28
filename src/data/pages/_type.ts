export interface Crumb { label: string; href?: string; }
export interface PageData {
  id: number;
  slug: string;            // leading+trailing slash, decoded Hebrew
  kind: 'service' | 'article';
  metaTitle: string;
  metaDesc?: string;
  canonical?: string;
  h1: string;
  heroImage?: string;
  heroAlt?: string;
  sidebar?: string;
  breadcrumbs?: Crumb[];
  date?: string;
  modified?: string;
  noindex?: boolean;
  content: string;
}
