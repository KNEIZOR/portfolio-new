import dotenv from 'dotenv';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in the root .env file before seeding.');
if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the root .env file before seeding.');
if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 4, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 }) });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({ where: { email }, create: { email, passwordHash }, update: { passwordHash } });
  console.log('Administrator credentials are initialized for ' + email + '.');
} finally {
  await prisma.$disconnect();
}
