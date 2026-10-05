import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const publicLinks = {
  email: (import.meta.env.VITE_PUBLIC_EMAIL as string | undefined) || 'denisstukalo33@gmail.com',
  telegram: (import.meta.env.VITE_PUBLIC_TELEGRAM_URL as string | undefined) || 'https://t.me/kneizor',
  github: (import.meta.env.VITE_PUBLIC_GITHUB_URL as string | undefined) || 'https://github.com/KNEIZOR',
};

export function ContactLinks() {
  const { t } = useTranslation();
  const telegramHandle = publicLinks.telegram.replace(/^https?:\/\/(www\.)?t\.me\//, '').replace(/\/$/, '');
  const githubHandle = publicLinks.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
  const links = [
    { key: 'email', label: t('contact.email'), href: 'mailto:' + publicLinks.email, value: publicLinks.email },
    { key: 'telegram', label: t('contact.telegram'), href: publicLinks.telegram, value: telegramHandle ? '@' + telegramHandle : '↗' },
    { key: 'github', label: t('contact.github'), href: publicLinks.github, value: githubHandle || '↗' },
  ];
  return <div className="contact-links">{links.map((item) => <a key={item.key} href={item.href} target={item.key === 'email' ? undefined : '_blank'} rel="noreferrer" data-cursor={item.label + ' →'}><span>{item.label}</span><span>{item.value}</span></a>)}</div>;
}

export default function SiteFooter() {
  const { t } = useTranslation();
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yerevan', hour12: false }).format(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <footer className="site-footer">
    <div className="site-footer__top"><a className="site-footer__logo" href="#top">DENIS<span>.</span>DEV</a><span className="mono">© {new Date().getFullYear()}</span><span>{t('footer.role')}</span></div>
    <div className="site-footer__bottom"><span>{t('footer.built')}</span><span><span className="mono">{time}</span> · {t('footer.time')}</span><a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t('footer.top')} <span>↑</span></a></div>
  </footer>;
}
