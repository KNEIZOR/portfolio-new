import { useEffect, useState, type PointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../app/api';
import type { Locale, PublicProject } from '../app/types';
import { useReveal } from '../app/useMotion';
import { updateSeo } from '../app/seo';
import SiteFooter, { ContactLinks } from '../components/SiteFooter';

const categories = [
  { title: 'frontend', lines: 'itemsFrontend' },
  { title: 'backend', lines: 'itemsBackend' },
  { title: 'database', lines: 'itemsDatabase' },
  { title: 'tools', lines: 'itemsTools' },
] as const;

function ProjectCard({ project, index, locale }: { project: PublicProject; index: number; locale: Locale }) {
  const { t } = useTranslation();
  return <article className={'project-card project-card--' + (index % 2 === 0 ? 'left' : 'right')} data-reveal>
    <Link to={'/' + locale + '/projects/' + project.slug} className="project-card__link" data-cursor={t('work.open') + ' →'}>
      <div className="project-card__visual">
        {project.coverImage ? <img src={project.coverImage} alt={project.title} loading="lazy" /> : <div className="project-card__placeholder" aria-hidden="true"><span>{project.title.slice(0, 1)}</span></div>}
        <span className="project-card__number mono">0{index + 1}</span>
        <span className="project-card__view mono">{t('work.open')} <span>↗</span></span>
      </div>
      <div className="project-card__info">
        <div><h3>{project.title}</h3><p>{project.shortDescription}</p></div>
        <div className="project-card__meta"><span>{project.category}</span><span>{project.year}</span></div>
      </div>
      <div className="project-card__tech mono">{project.technologies.slice(0, 5).join(' · ')}</div>
    </Link>
  </article>;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const language = locale as Locale;
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoading(true); setFailed(false);
    const controller = new AbortController();
    api.projects(language, controller.signal).then((data) => setProjects(data)).catch(() => { if (!controller.signal.aborted) setFailed(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    updateSeo(language, '/' + language, t('meta.title'), t('meta.description'));
    return () => controller.abort();
  }, [language, t]);
  useReveal([projects, loading]);

  const moveOrb = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--pointer-x', String(x));
    event.currentTarget.style.setProperty('--pointer-y', String(y));
  };
  const moveContactButton = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.13;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.13;
    event.currentTarget.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  };

  return <>
    <div id="top" />
    <section className="hero" onPointerMove={moveOrb} aria-labelledby="hero-title">
      <div className="hero__orb" aria-hidden="true"><span /></div>
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__content">
        <div className="hero__kicker"><span className="mono">{t('hero.eyebrow')}</span><span className="hero__separator" /><span className="mono">{t('hero.location')}</span></div>
        <h1 id="hero-title" className="hero__title"><span>{t('hero.line1')}</span><span>{t('hero.line2')}</span><span>{t('hero.line3')}</span></h1>
        <div className="hero__bottom"><p>{t('hero.description')}</p><a className="text-link" href="#projects" data-cursor="↓"><span>{t('hero.cta')}</span><span className="text-link__arrow">↓</span></a></div>
      </div>
      <div className="hero__index mono"><span>01</span><span>—</span><span>04</span></div>
      <div className="hero__scroll mono"><span className="hero__scroll-line" />{t('hero.scroll')}</div>
    </section>

    <section className="about section-pad" id="about" aria-labelledby="about-title">
      <div className="section-label mono" data-reveal>{t('about.label')}</div>
      <div className="about__layout">
        <h2 id="about-title" className="display-heading about__heading" data-reveal><span>{t('about.heading1')}</span><span>{t('about.heading2')}</span><span>{t('about.heading3')}</span></h2>
        <div className="about__copy" data-reveal><p>{t('about.p1')}</p><p>{t('about.p2')}</p><div className="about__signature mono">{t('about.signature')}</div></div>
      </div>
      <div className="metrics" data-reveal><div><strong>01<span>+</span></strong><span>{t('about.metric1')}</span></div><div><strong>FULL<span>STACK</span></strong><span>{t('about.metric2')}</span></div><div><strong>WORLD<span>WIDE</span></strong><span>{t('about.metric3')}</span></div></div>
    </section>

    <section className="work section-pad" id="projects" aria-labelledby="work-title">
      <div className="section-label mono" data-reveal>{t('work.label')}</div>
      <div className="work__heading-row"><h2 id="work-title" className="display-heading work__heading" data-reveal><span>{t('work.heading1')}</span><span>{t('work.heading2')}</span></h2><p data-reveal>{t('work.intro')}</p></div>
      {loading && <p className="work__state mono">{t('work.loading')}</p>}
      {failed && <p className="work__state" role="status">{t('work.error')}</p>}
      {!loading && !failed && projects.length > 0 && <div className="project-list">{projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} locale={language} />)}</div>}
      {!loading && !failed && projects.length === 0 && <div className="work__empty" data-reveal><span className="work__empty-index mono">✳</span><div><h3>{t('work.emptyTitle')}</h3><p>{t('work.emptyText')}</p></div></div>}
    </section>

    <section className="stack section-pad" id="stack" aria-labelledby="stack-title">
      <div className="section-label mono" data-reveal>{t('stack.label')}</div>
      <div className="stack__heading-row"><h2 id="stack-title" className="display-heading" data-reveal>{t('stack.heading')}</h2><span className="stack__asterisk" aria-hidden="true">✳</span></div>
      <div className="stack__columns">{categories.map((category, index) => <div className="stack__column" key={category.title} data-reveal><span className="mono stack__number">0{index + 1}</span><h3>{t('stack.' + category.title)}</h3><p>{t('stack.' + category.lines).split('\n').map((line) => <span key={line}>{line}</span>)}</p></div>)}</div>
      <div className="marquee" aria-label={t('stack.marquee')}><div className="marquee__track" aria-hidden="true"><span>{t('stack.marquee')}</span><span>{t('stack.marquee')}</span></div></div>
    </section>

    <section className="philosophy section-pad" aria-labelledby="philosophy-title">
      <div className="section-label mono" data-reveal>{t('philosophy.label')}</div>
      <div className="philosophy__content"><h2 id="philosophy-title" className="display-heading"><span data-reveal>{t('philosophy.line1')}</span><span data-reveal>{t('philosophy.line2')}</span><span data-reveal>{t('philosophy.line3')}</span></h2><ul>{[1, 2, 3, 4].map((item) => <li key={item} data-reveal><span className="mono">0{item}</span>{t('philosophy.point' + item)}</li>)}</ul></div>
      <div className="philosophy__glow" aria-hidden="true" />
    </section>

    <section className="contact section-pad" id="contact" aria-labelledby="contact-title">
      <div className="section-label mono" data-reveal>{t('contact.label')}</div>
      <p className="contact__eyebrow mono" data-reveal>{t('contact.eyebrow')}</p>
      <h2 id="contact-title" className="display-heading contact__heading" data-reveal><span>{t('contact.line1')}</span><span>{t('contact.line2')}</span><span>{t('contact.line3')}</span></h2>
      <div className="contact__bottom"><p>{t('contact.availability')}</p><a className="contact__cta" href={'mailto:' + (import.meta.env.VITE_PUBLIC_EMAIL || 'denisstukalo33@gmail.com')} data-cursor="↗" onPointerMove={moveContactButton} onPointerLeave={(event) => { event.currentTarget.style.transform = ''; }}><span>{t('contact.cta')}</span><span>↗</span></a></div>
      <ContactLinks />
    </section>
    <SiteFooter />
  </>;
}
