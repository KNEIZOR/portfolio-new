import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, api } from '../app/api';
import type { Locale, PublicProject } from '../app/types';
import { projectSeo, updateSeo } from '../app/seo';
import { useReveal } from '../app/useMotion';
import ProjectGallery from '../components/ProjectGallery';
import SiteFooter from '../components/SiteFooter';

export default function ProjectPage() {
  const { t } = useTranslation();
  const { locale = 'en', slug = '' } = useParams();
  const language = locale as Locale;
  const [project, setProject] = useState<PublicProject | null>(null);
  const [nextProject, setNextProject] = useState<PublicProject | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'not-found' | 'ready'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading'); setProject(null);
    Promise.all([api.project(slug, language), api.projects(language)]).then(([selected, list]) => {
      if (!active) return;
      setProject(selected);
      const currentIndex = list.findIndex((item) => item.slug === selected.slug);
      const upcoming = list.length > 1 ? list[(currentIndex + 1 + list.length) % list.length] : null;
      setNextProject(upcoming ?? null);
      setStatus('ready');
      projectSeo(selected, language, '/' + language + '/projects/' + slug);
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 404) {
        setStatus('not-found');
        updateSeo(language, '/' + language + '/projects/' + slug, t('project.notFound'), t('project.notFound'), true);
      } else setStatus('error');
    });
    return () => { active = false; };
  }, [slug, language, t]);
  useReveal([project, status]);

  if (status === 'loading') return <div className="project-state mono" role="status">{t('project.loading')}</div>;
  if (status !== 'ready' || !project) return <div className="project-state"><span className="mono">{status === 'not-found' ? '404' : '—'}</span><p>{status === 'not-found' ? t('project.notFound') : t('common.networkError')}</p><Link className="text-link" to={'/' + language}>{t('project.back')} <span>←</span></Link></div>;

  const translation = project.translation;
  return <>
    <div id="top" />
    <article className="project-detail">
      <header className="project-hero section-pad">
        <Link to={'/' + language + '#projects'} className="project-back mono" data-cursor="←">← {t('project.back')}</Link>
        <div className="project-hero__eyebrow mono"><span>{project.category}</span><span>{String(project.year)}</span></div>
        <h1 className="project-hero__title" data-reveal>{project.title}</h1>
        <p className="project-hero__intro" data-reveal>{project.shortDescription}</p>
        {project.coverImage && <div className="project-hero__cover" data-reveal><img src={project.coverImage} alt={project.title} fetchPriority="high" /></div>}
        <div className="project-facts" data-reveal><div><span className="mono">{t('project.role')}</span><strong>{project.role}</strong></div>{project.client && <div><span className="mono">{t('project.client')}</span><strong>{project.client}</strong></div>}<div><span className="mono">{t('project.year')}</span><strong>{project.year}</strong></div></div>
      </header>
      <div className="project-body section-pad">
        <section className="project-copy-block" data-reveal><span className="section-label mono">01 — {t('project.overview')}</span><div><h2>{t('project.overview')}</h2><p>{translation?.fullDescription || project.shortDescription}</p></div></section>
        <section className="project-copy-grid"><div data-reveal><span className="section-label mono">02 — {t('project.challenge')}</span><h2>{t('project.challenge')}</h2><p>{translation?.challenge}</p></div><div data-reveal><span className="section-label mono">03 — {t('project.solution')}</span><h2>{t('project.solution')}</h2><p>{translation?.solution}</p></div></section>
        {translation?.technicalApproach && <section className="project-copy-block" data-reveal><span className="section-label mono">04 — {t('project.approach')}</span><div><h2>{t('project.approach')}</h2><p>{translation.technicalApproach}</p></div></section>}
        {project.features && project.features.length > 0 && <section className="project-features" data-reveal><span className="section-label mono">05 — {t('project.features')}</span><h2>{t('project.features')}</h2><ul>{project.features.map((feature, index) => <li key={feature.id}><span className="mono">0{index + 1}</span>{feature.text}</li>)}</ul></section>}
        {project.technologies.length > 0 && <section className="project-tech" data-reveal><span className="section-label mono">{t('project.stack')}</span><div>{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></section>}
        <ProjectGallery images={project.images ?? []} title={project.title} />
        <div className="project-links">{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer" data-cursor="↗">{t('project.live')} <span>↗</span></a>}{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer" data-cursor="↗">{t('project.github')} <span>↗</span></a>}</div>
      </div>
      {nextProject && <Link to={'/' + language + '/projects/' + nextProject.slug} className="next-project" data-cursor={t('project.next') + ' →'}><span className="mono">{t('project.next')}</span><strong>{nextProject.title}</strong><span className="next-project__arrow">↗</span>{nextProject.coverImage && <img src={nextProject.coverImage} alt="" loading="lazy" />}</Link>}
    </article>
    <SiteFooter />
  </>;
}
