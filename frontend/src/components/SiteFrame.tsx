import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isLocale } from '../app/i18n';
import { useSmoothScroll } from '../app/useMotion';
import { updateSeo } from '../app/seo';
import SiteNav from './SiteNav';
import CustomCursor from './CustomCursor';
import NotFoundPage from '../pages/NotFoundPage';

export default function SiteFrame() {
  const { locale: rawLocale } = useParams();
  const localeValid = isLocale(rawLocale);
  const locale = localeValid ? rawLocale : 'en';
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const [switching, setSwitching] = useState(false);
  useSmoothScroll();

  useLayoutEffect(() => {
    if (!localeValid) return;
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    localStorage.setItem('denis-locale', locale);
    if (location.pathname === '/' + locale || location.pathname === '/' + locale + '/') {
      updateSeo(locale, location.pathname, t('meta.title'), t('meta.description'));
    }
  }, [locale, localeValid, i18n, location.pathname, t]);

  useEffect(() => {
    if (!location.hash) return;
    const timer = setTimeout(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' }), 140);
    return () => clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    const timer = setTimeout(() => setSwitching(false), 650);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!localeValid) return <NotFoundPage locale="en" />;
  return <div className="site-shell" onClickCapture={(event) => {
    const link = (event.target as HTMLElement).closest('a');
    if (link?.getAttribute('href')?.startsWith('/' + locale + '/projects/')) setSwitching(true);
  }}>
    <SiteNav />
    <main className={switching ? 'page-transition page-transition--leaving' : 'page-transition'}><Outlet /></main>
    <CustomCursor />
  </div>;
}
