import type { User } from './generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      admin?: Pick<User, 'id' | 'email'>;
    }
  }
}

export {};
