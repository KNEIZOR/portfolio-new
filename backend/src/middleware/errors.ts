import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Please check the submitted fields.', code: 'VALIDATION_ERROR', details: error.flatten() });
    return;
  }
  if (error instanceof Error && 'code' in error && error.code === 'P2002') {
    res.status(409).json({ error: 'A project with that slug already exists.', code: 'CONFLICT' });
    return;
  }
  if (error instanceof Error && error.name === 'MulterError') {
    res.status(413).json({ error: 'The selected file is too large or there are too many files.', code: 'UPLOAD_LIMIT' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'An unexpected server error occurred.', code: 'INTERNAL_ERROR' });
};
