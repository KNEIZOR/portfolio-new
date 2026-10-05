import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../app/types';
import { updateSeo } from '../app/seo';

export default function NotFoundPage({ locale }: { locale: Locale }) {
  const { t, i18n } = useTranslation();
  useLayoutEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    updateSeo(locale, '/' + locale + '/404', t('notFound.title'), t('notFound.body'), true);
  }, [locale, i18n, t]);
  return <main className="not-found" lang={locale}>
    <div className="not-found__mark mono">DENIS<span>.</span>DEV</div>
    <span className="not-found__number">{t('notFound.number')}</span>
    <div className="not-found__content"><p className="mono">{t('notFound.title')}</p><p>{t('notFound.body')}</p><Link className="text-link" to={'/' + locale}>{t('notFound.home')} <span>↗</span></Link></div>
  </main>;
}
