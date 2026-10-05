import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middleware/errors.js';

export const projectsRouter = Router();
const locales = ['en', 'ru', 'hy'] as const;
function parseLocale(value: unknown) {
  if (typeof value !== 'string' || !locales.includes(value as (typeof locales)[number])) return 'en';
  return value as (typeof locales)[number];
}

projectsRouter.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'PUBLISHED' }, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: { translations: true, technologies: { include: { technology: true } } },
    });
    const locale = parseLocale(req.query.locale);
    res.json(projects.map((project) => {
      const translation = project.translations.find((item) => item.locale === locale) ?? project.translations.find((item) => item.locale === 'en');
      return { id: project.id, slug: project.slug, category: project.category, year: project.year, role: project.role,
        coverImage: project.coverImage, technologies: project.technologies.map((item) => item.technology.name),
        title: translation?.title ?? '', shortDescription: translation?.shortDescription ?? '', locale: translation?.locale ?? 'en' };
    }));
  } catch (error) { next(error); }
});

projectsRouter.get('/:slug', async (req, res, next) => {
  try {
    const locale = parseLocale(req.query.locale);
    const project = await (await import('../services/projects.js')).getPublicProject(req.params.slug, locale);
    if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    res.json(project);
  } catch (error) { next(error); }
});
