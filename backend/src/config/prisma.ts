import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: process.env.VERCEL ? 1 : 12, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });

export const prisma = new PrismaClient({ adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
