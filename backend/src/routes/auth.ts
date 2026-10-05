import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashToken, requireAdmin, sessionCookieName } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

export const authRouter = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.', code: 'RATE_LIMITED' } });
const cookieOptions = { httpOnly: true, secure: env.production, sameSite: 'lax' as const, path: '/', maxAge: 1000 * 60 * 60 * 24 * 7 };

authRouter.post('/login', loginLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 200) {
      throw new HttpError(400, 'Enter a valid email and password.', 'VALIDATION_ERROR');
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.', 'LOGIN_FAILED');
    const token = randomBytes(32).toString('base64url');
    await prisma.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + cookieOptions.maxAge) } });
    res.cookie(sessionCookieName, token, cookieOptions);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) { next(error); }
});

authRouter.get('/me', requireAdmin, (req, res) => res.json({ user: req.admin }));

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[sessionCookieName];
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie(sessionCookieName, { httpOnly: true, secure: env.production, sameSite: 'lax', path: '/' });
    res.status(204).end();
  } catch (error) { next(error); }
});
