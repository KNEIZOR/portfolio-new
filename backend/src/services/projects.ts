import { Prisma, type Locale } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import type { ProjectInput } from '../validators/project.js';
import { HttpError } from '../middleware/errors.js';

const projectInclude = {
  translations: true,
  images: { orderBy: { order: 'asc' as const }, include: { altTranslations: true } },
  technologies: { include: { technology: true } },
  features: { orderBy: { order: 'asc' as const }, include: { translations: true } },
};

export function completeness(project: { translations: Array<{ locale: Locale; title: string; shortDescription: string; fullDescription: string }> }) {
  return Object.fromEntries((['en', 'ru', 'hy'] as const).map((locale) => {
    const translation = project.translations.find((item) => item.locale === locale);
    return [locale, Boolean(translation?.title.trim() && translation.shortDescription.trim() && translation.fullDescription.trim())];
  })) as Record<Locale, boolean>;
}

export function localizedProject(project: any, locale: Locale) {
  const preferredTranslation = project.translations.find((item: any) => item.locale === locale) ?? null;
  const fallbackTranslation = project.translations.find((item: any) => item.locale === 'en') ?? preferredTranslation;
  const localizedText = (field: string) => preferredTranslation?.[field]?.trim()
    ? preferredTranslation[field]
    : fallbackTranslation?.[field] ?? '';
  const translation = preferredTranslation ? {
    ...preferredTranslation,
    title: localizedText('title'),
    shortDescription: localizedText('shortDescription'),
    fullDescription: localizedText('fullDescription'),
    challenge: localizedText('challenge'),
    solution: localizedText('solution'),
    technicalApproach: localizedText('technicalApproach'),
    seoTitle: localizedText('seoTitle'),
    seoDescription: localizedText('seoDescription'),
  } : fallbackTranslation;
  const imageAlt = (image: any) => image.altTranslations.find((item: any) => item.locale === locale)?.alt
    || image.altTranslations.find((item: any) => item.locale === 'en')?.alt || '';
  const featureText = (feature: any) => feature.translations.find((item: any) => item.locale === locale)?.text
    || feature.translations.find((item: any) => item.locale === 'en')?.text || '';
  return {
    id: project.id,
    slug: project.slug,
    category: project.category,
    year: project.year,
    role: project.role,
    client: project.client,
    liveUrl: project.liveUrl,
    githubUrl: project.githubUrl,
    coverImage: project.coverImage,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    locale: translation?.locale ?? 'en',
    title: translation?.title ?? '',
    shortDescription: translation?.shortDescription ?? '',
    translation,
    technologies: project.technologies.map((item: any) => item.technology.name),
    images: (project.images ?? []).map((image: any) => ({ id: image.id, imageUrl: image.imageUrl, order: image.order, alt: imageAlt(image) })),
    features: (project.features ?? []).map((feature: any) => ({ id: feature.id, order: feature.order, text: featureText(feature) })).filter((item: any) => item.text),
  };
}

function assertPublishable(input: ProjectInput) {
  if (input.status !== 'PUBLISHED') return;
  const translations = input.translations;
  const english = translations.find((item) => item.locale === 'en');
  if (!english?.title.trim() || !english.shortDescription.trim() || !english.fullDescription.trim()) {
    throw new HttpError(422, 'An English title, short description, and full description are required to publish.', 'EN_TRANSLATION_REQUIRED');
  }
  const completeLocales = new Set(translations.filter((item) => item.title.trim() && item.shortDescription.trim() && item.fullDescription.trim()).map((item) => item.locale));
  if ((!completeLocales.has('ru') || !completeLocales.has('hy')) && !input.publishAnyway) {
    throw new HttpError(409, 'Russian and Armenian translations are incomplete.', 'MISSING_TRANSLATIONS');
  }
}

async function saveRelations(tx: Prisma.TransactionClient, projectId: string, input: ProjectInput) {
  await tx.projectTranslation.deleteMany({ where: { projectId } });
  for (const translation of input.translations) {
    await tx.projectTranslation.create({ data: {
      projectId, locale: translation.locale, title: translation.title, shortDescription: translation.shortDescription,
      fullDescription: translation.fullDescription, challenge: translation.challenge, solution: translation.solution,
      technicalApproach: translation.technicalApproach, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription,
    } });
  }

  await tx.projectFeature.deleteMany({ where: { projectId } });
  const maxFeatures = Math.max(0, ...input.translations.map((translation) => translation.features.length));
  for (let order = 0; order < maxFeatures; order += 1) {
    const feature = await tx.projectFeature.create({ data: { projectId, order } });
    for (const translation of input.translations) {
      const value = translation.features[order]?.trim();
      if (value) await tx.projectFeatureTranslation.create({ data: { featureId: feature.id, locale: translation.locale, text: value } });
    }
  }

  await tx.projectTechnology.deleteMany({ where: { projectId } });
  const uniqueTechnologies = new Map<string, string>();
  for (const rawName of input.technologies) {
    const name = rawName.trim();
    if (name && !uniqueTechnologies.has(name.toLowerCase())) uniqueTechnologies.set(name.toLowerCase(), name);
  }
  for (const name of uniqueTechnologies.values()) {
    const technology = await tx.technology.upsert({ where: { name }, create: { name }, update: {} });
    await tx.projectTechnology.create({ data: { projectId, technologyId: technology.id } });
  }

  await tx.projectImage.deleteMany({ where: { projectId } });
  for (let order = 0; order < input.images.length; order += 1) {
    const image = input.images[order]!;
    const created = await tx.projectImage.create({ data: { projectId, imageUrl: image.imageUrl, order } });
    for (const locale of ['en', 'ru', 'hy'] as const) {
      const alt = image.alt[locale].trim();
      if (alt) await tx.projectImageTranslation.create({ data: { projectImageId: created.id, locale, alt } });
    }
  }
}

export async function createProject(input: ProjectInput) {
  assertPublishable(input);
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({ data: {
      slug: input.slug, category: input.category, year: input.year, role: input.role,
      client: input.client || null, liveUrl: input.liveUrl || null, githubUrl: input.githubUrl || null,
      coverImage: input.coverImage || null, status: input.status,
    } });
    await saveRelations(tx, project.id, input);
    return tx.project.findUniqueOrThrow({ where: { id: project.id }, include: projectInclude });
  });
}

export async function updateProject(id: string, input: ProjectInput) {
  assertPublishable(input);
  return prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: {
      slug: input.slug, category: input.category, year: input.year, role: input.role,
      client: input.client || null, liveUrl: input.liveUrl || null, githubUrl: input.githubUrl || null,
      coverImage: input.coverImage || null, status: input.status,
    } });
    await saveRelations(tx, id, input);
    return tx.project.findUniqueOrThrow({ where: { id }, include: projectInclude });
  });
}

export async function getAdminProject(id: string) {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}

export async function getAdminProjects() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, include: projectInclude });
  return projects.map((project) => ({ ...project, completeness: completeness(project) }));
}

export async function getPublicProjects(locale: Locale) {
  const projects = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    include: {
      translations: { where: { locale: { in: [locale, 'en'] } }, select: { locale: true, title: true, shortDescription: true } },
      technologies: { include: { technology: true } },
    },
  });
  return projects.map((project) => localizedProject(project, locale));
}

export async function getPublicProject(slug: string, locale: Locale) {
  const project = await prisma.project.findFirst({ where: { slug, status: 'PUBLISHED' }, include: projectInclude });
  return project ? localizedProject(project, locale) : null;
}

export async function getAdminCounts() {
  const [total, published, drafts, projects] = await Promise.all([
    prisma.project.count(), prisma.project.count({ where: { status: 'PUBLISHED' } }), prisma.project.count({ where: { status: 'DRAFT' } }),
    prisma.project.findMany({ select: { translations: { select: { locale: true, title: true, shortDescription: true, fullDescription: true } } } }),
  ]);
  const totalLocales = projects.length * 3;
  const complete = projects.reduce((sum, project) => sum + Object.values(completeness(project)).filter(Boolean).length, 0);
  return { total, published, drafts, translationCompleteness: totalLocales ? Math.round(complete / totalLocales * 100) : 0 };
}

export const includeAdminProject = projectInclude;
