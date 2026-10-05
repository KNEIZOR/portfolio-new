import type { RequestHandler } from 'express';
import { createHmac } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { HttpError } from './errors.js';

export const sessionCookieName = env.production ? '__Host-denis_session' : 'denis_session';
export const hashToken = (token: string) => createHmac('sha256', env.sessionSecret).update(token).digest('hex');

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[sessionCookieName];
    if (!token) throw new HttpError(401, 'Authentication required.', 'UNAUTHORIZED');
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new HttpError(401, 'Authentication required.', 'UNAUTHORIZED');
    }
    req.admin = session.user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireSameOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (origin && !env.allowedOrigins.includes(origin)) {
    next(new HttpError(403, 'Request origin is not allowed.', 'ORIGIN_FORBIDDEN'));
    return;
  }
  next();
};
