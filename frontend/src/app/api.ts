import type { Locale, ProjectPayload, PublicProject } from './types';
import { upload as uploadToBlob } from '@vercel/blob/client';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }) { super(message); this.name = 'ApiError'; }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      ...init,
      credentials: 'include',
      headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? 'REQUEST_FAILED', response.status, data.code, data.details);
  return data as T;
}

export const api = {
  projects: (locale: Locale, signal?: AbortSignal) => request<PublicProject[]>('/projects?locale=' + locale, { signal }),
  project: (slug: string, locale: Locale) => request<PublicProject>('/projects/' + encodeURIComponent(slug) + '?locale=' + locale),
  login: (email: string, password: string) => request<{ user: { id: string; email: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: { id: string; email: string } }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  dashboard: () => request<{ metrics: { total: number; published: number; drafts: number; translationCompleteness: number }; recent: AdminProject[] }>('/admin/dashboard'),
  adminProjects: () => request<AdminProject[]>('/admin/projects'),
  adminProject: (id: string) => request<AdminProject>('/admin/projects/' + encodeURIComponent(id)),
  createProject: (payload: ProjectPayload) => request<AdminProject>('/admin/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id: string, payload: ProjectPayload) => request<AdminProject>('/admin/projects/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (id: string) => request<void>('/admin/projects/' + encodeURIComponent(id), { method: 'DELETE' }),
  upload: async (files: File[]) => {
    if (import.meta.env.VITE_BLOB_UPLOADS === 'true') {
      const urls = await Promise.all(files.map(async (file) => {
        const extension = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/png' ? '.png' : file.type === 'image/avif' ? '.avif' : '.webp';
        const blob = await uploadToBlob('portfolio/' + crypto.randomUUID() + extension, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/blob-uploads',
        });
        return blob.url;
      }));
      return { urls };
    }
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<{ urls: string[] }>('/admin/uploads', { method: 'POST', body: form });
  },
  reorderImages: (id: string, imageIds: string[]) => request<void>('/admin/projects/' + encodeURIComponent(id) + '/images/order', { method: 'PATCH', body: JSON.stringify({ imageIds }) }),
};

export interface AdminProject {
  id: string;
  slug: string;
  category: string;
  year: number;
  role: string;
  client: string | null;
  liveUrl: string | null;
  githubUrl: string | null;
  coverImage: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
  translations: (Omit<import('./types').Translation, 'features'> & { features?: string[] })[];
  images: (import('./types').GalleryImage & { altTranslations?: { locale: Locale; alt: string }[] })[];
  technologies: { technology: { name: string } }[] | string[];
  features?: { order: number; translations: { locale: Locale; text: string }[] }[];
  completeness?: Record<Locale, boolean>;
}
