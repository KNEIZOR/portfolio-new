import { Router, type RequestHandler } from 'express';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAdmin, requireSameOrigin } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';

export const blobUploadsRouter = Router();

const authorizeTokenRequest: RequestHandler = (req, res, next) => {
  if (req.body?.type === 'blob.upload-completed') {
    next();
    return;
  }
  requireAdmin(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    requireSameOrigin(req, res, next);
  });
};

blobUploadsRouter.post('/admin/blob-uploads', authorizeTokenRequest, async (req, res, next) => {
  try {
    const result = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('portfolio/')) throw new HttpError(400, 'Invalid upload path.', 'INVALID_UPLOAD_PATH');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
          maximumSizeInBytes: env.maxUploadMb * 1024 * 1024,
          addRandomSuffix: false,
          cacheControlMaxAge: 31_536_000,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        if (!blob.url.startsWith('https://') || !blob.pathname.startsWith('portfolio/')) {
          throw new Error('Vercel Blob returned an unexpected upload.');
        }
      },
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
