import express from 'express';
import cors from 'cors';
import * as helmet from 'helmet';
import type { RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { adminRouter } from './routes/admin.js';
import { blobUploadsRouter } from './routes/blob-uploads.js';
import { errorHandler, HttpError, notFound } from './middleware/errors.js';

const helmetMiddleware = helmet.default as unknown as (options?: object) => RequestHandler;

export const app = express();
app.disable('x-powered-by');
if (env.production) app.set('trust proxy', 1);
app.use(helmetMiddleware({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.blob.vercel-storage.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origin is not allowed by CORS.', 'ORIGIN_FORBIDDEN'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', blobUploadsRouter);
app.use('/api/admin', adminRouter);

app.use('/uploads', express.static(env.uploadDir, { immutable: true, maxAge: '1y', index: false }));

if (env.production) {
  const frontendDist = process.env.VERCEL
    ? path.resolve(process.cwd(), 'frontend/dist')
    : path.resolve(process.cwd(), '../frontend/dist');
  if (existsSync(frontendDist)) {
    if (!process.env.VERCEL) {
      app.use(express.static(frontendDist, { index: false, maxAge: '1h', setHeaders(res, filePath) {
        if (filePath.includes(path.sep + 'assets' + path.sep)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } }));
    }
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }
}

app.use(notFound);
app.use(errorHandler);
