import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLocales, type Locale } from '../app/i18n';
import i18n from '../app/i18n';

const navItems = [
  { key: 'about', id: 'about' },
  { key: 'projects', id: 'projects' },
  { key: 'stack', id: 'stack' },
  { key: 'contact', id: 'contact' },
] as const;

export default function SiteNav() {
  const { t } = useTranslation();
  const { locale: routeLocale } = useParams();
  const locale = (routeLocale ?? 'en') as Locale;
  const location = useLocation();
  const navigate = useNavigate();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);

  const switchLanguage = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    void i18n.changeLanguage(nextLocale);
    localStorage.setItem('denis-locale', nextLocale);
    const path = location.pathname.replace(/^\/(en|ru|hy)(?=\/|$)/, '/' + nextLocale);
    navigate(path + location.search + location.hash);
  };

  const goToSection = (id: string) => {
    setMenuOpen(false);
    const homePath = '/' + locale;
    if (location.pathname !== homePath && location.pathname !== homePath + '/') {
      navigate(homePath + '#' + id);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', homePath + '#' + id);
  };

  return <>
    <header className={'site-nav' + (compact ? ' site-nav--compact' : '')}>
      <Link className="site-nav__brand" to={'/' + locale} aria-label={t('meta.title')} data-cursor="">DENIS<span>.</span>DEV</Link>
      <div className="site-nav__desktop">
        <nav className="site-nav__links" aria-label={t('nav.primary')}>
          {navItems.map((item) => <button key={item.id} type="button" onClick={() => goToSection(item.id)} data-cursor="">{t('nav.' + item.key)}</button>)}
        </nav>
        <div className="site-nav__status"><span className="status-dot" />{t('nav.available')}</div>
        <div className="language-switch" aria-label={t('nav.language')}>
          {supportedLocales.map((item) => <button key={item} type="button" aria-pressed={locale === item} className={locale === item ? 'is-current' : ''} onClick={() => switchLanguage(item)}>{item.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="site-nav__mobile-controls">
        <button type="button" className="menu-toggle" aria-label={menuOpen ? t('nav.close') : t('nav.menu')} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span /><span /></button>
      </div>
    </header>
    <div className={'mobile-menu' + (menuOpen ? ' mobile-menu--open' : '')} aria-hidden={!menuOpen}>
      <nav aria-label={t('nav.mobile')}>
        {navItems.map((item, index) => <button key={item.id} type="button" style={{ '--menu-index': index } as CSSProperties} tabIndex={menuOpen ? 0 : -1} onClick={() => goToSection(item.id)}>{t('nav.' + item.key)}<span>0{index + 1}</span></button>)}
      </nav>
      <div className="mobile-menu__bottom">
        <span className="site-nav__status"><span className="status-dot" />{t('nav.available')}</span>
        <div className="language-switch">{supportedLocales.map((item) => <button key={item} type="button" aria-pressed={locale === item} className={locale === item ? 'is-current' : ''} onClick={() => switchLanguage(item)}>{item.toUpperCase()}</button>)}</div>
      </div>
    </div>
  </>;
}
