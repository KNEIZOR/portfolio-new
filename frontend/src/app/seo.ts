import type { Locale, PublicProject } from './types';

const origin = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin;

function ensureMeta(attribute: 'name' | 'property', key: string) {
  let element = document.head.querySelector<HTMLMetaElement>('meta[' + attribute + '="' + key + '"]');
  if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
  return element;
}

function ensureLink(rel: string, hreflang?: string) {
  const selector = hreflang ? 'link[rel="' + rel + '"][hreflang="' + hreflang + '"]' : 'link[rel="' + rel + '"]';
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) { element = document.createElement('link'); element.rel = rel; if (hreflang) element.hreflang = hreflang; document.head.appendChild(element); }
  return element;
}

export function updateSeo(locale: Locale, path: string, title: string, description: string, noindex = false) {
  document.title = title;
  document.documentElement.lang = locale;
  ensureMeta('name', 'description').content = description;
  ensureMeta('property', 'og:title').content = title;
  ensureMeta('property', 'og:description').content = description;
  ensureMeta('name', 'robots').content = noindex ? 'noindex, nofollow' : 'index, follow';
  ensureLink('canonical').href = origin + path;
  if (noindex) {
    document.head.querySelectorAll('link[rel="alternate"]').forEach((element) => element.remove());
  } else {
    for (const lang of ['en', 'ru', 'hy'] as const) ensureLink('alternate', lang).href = origin + path.replace(/^\/(en|ru|hy)(?=\/|$)/, '/' + lang);
    ensureLink('alternate', 'x-default').href = origin + path.replace(/^\/(en|ru|hy)(?=\/|$)/, '/en');
  }
}

export function projectSeo(project: PublicProject, locale: Locale, requestedPath: string) {
  const title = project.translation?.seoTitle || (project.title + ' — DENIS.DEV');
  const description = project.translation?.seoDescription || project.shortDescription;
  updateSeo(locale, requestedPath, title, description);
}
