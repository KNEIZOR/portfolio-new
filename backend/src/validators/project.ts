import { z } from 'zod';

const safeUrl = z.string().url().refine((value) => ['https:', 'http:'].includes(new URL(value).protocol), 'Only HTTP(S) links are accepted.');
const blankToNull = z.preprocess((value) => value === '' ? null : value, safeUrl.nullable().optional());
const localeTranslation = z.object({
  locale: z.enum(['en', 'ru', 'hy']),
  title: z.string().trim().max(160).default(''),
  shortDescription: z.string().trim().max(320).default(''),
  fullDescription: z.string().trim().max(10000).default(''),
  challenge: z.string().trim().max(10000).default(''),
  solution: z.string().trim().max(10000).default(''),
  technicalApproach: z.string().trim().max(10000).default(''),
  seoTitle: z.string().trim().max(160).default(''),
  seoDescription: z.string().trim().max(320).default(''),
  features: z.array(z.string().trim().max(500)).max(24).default([]),
});

export const projectInputSchema = z.object({
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens for the slug.'),
  category: z.string().trim().min(1).max(120),
  year: z.number().int().min(1990).max(2100),
  role: z.string().trim().min(1).max(160),
  client: z.string().trim().max(160).nullable().optional(),
  liveUrl: blankToNull,
  githubUrl: blankToNull,
  coverImage: z.string().trim().max(2048).nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  technologies: z.array(z.string().trim().min(1).max(80)).max(32).default([]),
  translations: z.array(localeTranslation).max(3).default([]),
  images: z.array(z.object({
    imageUrl: z.string().trim().min(1).max(2048),
    alt: z.object({ en: z.string().max(240).default(''), ru: z.string().max(240).default(''), hy: z.string().max(240).default('') }).default({ en: '', ru: '', hy: '' }),
  })).max(32).default([]),
  publishAnyway: z.boolean().default(false),
}).superRefine((value, context) => {
  const locales = value.translations.map((translation) => translation.locale);
  if (new Set(locales).size !== locales.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['translations'], message: 'Each locale can only be supplied once.' });
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
