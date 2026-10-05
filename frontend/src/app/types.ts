export type Locale = 'en' | 'ru' | 'hy';
export type ProjectStatus = 'DRAFT' | 'PUBLISHED';
export interface Translation {
  id?: string;
  locale: Locale;
  title: string;
  shortDescription: string;
  fullDescription: string;
  challenge: string;
  solution: string;
  technicalApproach: string;
  seoTitle: string;
  seoDescription: string;
  features: string[];
}
export interface GalleryImage {
  id?: string;
  imageUrl: string;
  order?: number;
  alt: string;
  altTranslations?: { locale: Locale; alt: string }[];
}
export interface PublicProject {
  id: string;
  slug: string;
  category: string;
  year: number;
  role: string;
  client: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  coverImage: string | null;
  status: ProjectStatus;
  title: string;
  shortDescription: string;
  locale: Locale;
  technologies: string[];
  images?: GalleryImage[];
  features?: { id: string; order: number; text: string }[];
  translation?: Omit<Translation, 'features' | 'locale'> & { locale: Locale };
  createdAt?: string;
  updatedAt?: string;
}
export interface ProjectPayload {
  slug: string;
  category: string;
  year: number;
  role: string;
  client: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  coverImage: string | null;
  status: ProjectStatus;
  technologies: string[];
  translations: Translation[];
  images: { imageUrl: string; alt: Record<Locale, string> }[];
  publishAnyway?: boolean;
}
export type Completeness = Record<Locale, boolean>;
