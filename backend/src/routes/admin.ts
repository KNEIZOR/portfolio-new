import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { requireAdmin, requireSameOrigin } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { createProject, getAdminCounts, getAdminProject, getAdminProjects, updateProject, completeness } from '../services/projects.js';
import { storage, type ImageMime } from '../services/storage.js';
import { projectInputSchema } from '../validators/project.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin, requireSameOrigin);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 16 } });
const acceptedImageMimes: ImageMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const batchUploadLimit: RequestHandler = (req, _res, next) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.reduce((total, file) => total + file.size, 0) > env.maxUploadMb * 4 * 1024 * 1024) {
    next(new HttpError(413, 'The combined upload is too large. Upload fewer images at once.', 'UPLOAD_LIMIT'));
    return;
  }
  next();
};

async function verifiedImageMimes(files: Express.Multer.File[]) {
  const detected = await Promise.all(files.map((file) => fileTypeFromBuffer(file.buffer)));
  if (detected.some((type) => !type || !acceptedImageMimes.includes(type.mime as ImageMime))) {
    throw new HttpError(415, 'Only JPG, PNG, WebP, and AVIF images are accepted.', 'INVALID_IMAGE');
  }
  return detected.map((type) => type!.mime as ImageMime);
}

adminRouter.get('/dashboard', async (_req, res, next) => {
  try { res.json({ metrics: await getAdminCounts(), recent: (await getAdminProjects()).slice(0, 5) }); }
  catch (error) { next(error); }
});

adminRouter.get('/projects', async (_req, res, next) => {
  try { res.json(await getAdminProjects()); } catch (error) { next(error); }
});

adminRouter.get('/projects/:id', async (req, res, next) => {
  try {
    const project = await getAdminProject(req.params.id);
    if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    res.json({ ...project, completeness: completeness(project) });
  } catch (error) { next(error); }
});

adminRouter.post('/projects/:id/images', upload.array('files', 16), batchUploadLimit, async (req, res, next) => {
  const saved: string[] = [];
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) throw new HttpError(400, 'Choose at least one image.', 'NO_FILES');
    const mimes = await verifiedImageMimes(files);
    for (let index = 0; index < files.length; index += 1) saved.push(await storage.save(files[index]!.buffer, mimes[index]!));
    const images = await prisma.$transaction(async (tx) => {
      const firstOrder = await tx.projectImage.count({ where: { projectId: project.id } });
      const added = [];
      for (let index = 0; index < saved.length; index += 1) {
        added.push(await tx.projectImage.create({ data: { projectId: project.id, imageUrl: saved[index]!, order: firstOrder + index } }));
      }
      return added;
    });
    res.status(201).json({ images });
  } catch (error) {
    await Promise.all(saved.map((url) => storage.remove(url).catch(() => undefined)));
    next(error);
  }
});

adminRouter.post('/uploads', upload.array('files', 16), batchUploadLimit, async (req, res, next) => {
  const saved: string[] = [];
  try {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) throw new HttpError(400, 'Choose at least one image.', 'NO_FILES');
    const mimes = await verifiedImageMimes(files);
    for (let index = 0; index < files.length; index += 1) saved.push(await storage.save(files[index]!.buffer, mimes[index]!));
    res.status(201).json({ urls: saved });
  } catch (error) {
    await Promise.all(saved.map((url) => storage.remove(url).catch(() => undefined)));
    next(error);
  }
});

adminRouter.post('/projects', async (req, res, next) => {
  try {
    const input = projectInputSchema.parse(req.body);
    const project = await createProject(input);
    res.status(201).json({ ...project, completeness: completeness(project) });
  } catch (error) { next(error); }
});

adminRouter.patch('/projects/:id', async (req, res, next) => {
  try {
    const input = projectInputSchema.parse(req.body);
    const previous = await getAdminProject(req.params.id);
    if (!previous) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    const project = await updateProject(req.params.id, input);
    const retained = new Set([input.coverImage, ...input.images.map((image) => image.imageUrl)].filter(Boolean));
    const removed = [...previous.images.map((image) => image.imageUrl), previous.coverImage].filter((url): url is string => Boolean(url && !retained.has(url)));
    await Promise.all(removed.map((url) => storage.remove(url).catch((error) => console.error('Could not remove replaced image from storage', error))));
    res.json({ ...project, completeness: completeness(project) });
  } catch (error) { next(error); }
});

adminRouter.patch('/projects/:id/images/order', async (req, res, next) => {
  try {
    const imageIds = req.body?.imageIds;
    if (!Array.isArray(imageIds) || imageIds.some((id: unknown) => typeof id !== 'string') || imageIds.length > 32) {
      throw new HttpError(400, 'Provide an ordered list of image ids.', 'VALIDATION_ERROR');
    }
    await prisma.$transaction(async (tx) => {
      const images = await tx.projectImage.findMany({ where: { projectId: req.params.id }, select: { id: true } });
      if (images.length !== imageIds.length || images.some((image) => !imageIds.includes(image.id))) throw new HttpError(400, 'Image order does not match this project.', 'INVALID_IMAGE_ORDER');
      for (const [order, id] of imageIds.entries()) await tx.projectImage.update({ where: { id }, data: { order } });
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

adminRouter.delete('/projects/:id/images/:imageId', async (req, res, next) => {
  try {
    const image = await prisma.projectImage.findFirst({ where: { id: req.params.imageId, projectId: req.params.id } });
    if (!image) throw new HttpError(404, 'Image not found.', 'NOT_FOUND');
    await prisma.projectImage.delete({ where: { id: image.id } });
    await storage.remove(image.imageUrl).catch((error) => console.error('Could not remove image from storage', error));
    res.status(204).end();
  } catch (error) { next(error); }
});

adminRouter.delete('/projects/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { images: true } });
    if (!project) throw new HttpError(404, 'Project not found.', 'NOT_FOUND');
    await prisma.project.delete({ where: { id: project.id } });
    const urls = [...project.images.map((image) => image.imageUrl), ...(project.coverImage ? [project.coverImage] : [])];
    await Promise.all(urls.map((url) => storage.remove(url).catch((error) => console.error('Could not remove image from storage', error))));
    res.status(204).end();
  } catch (error) { next(error); }
});
