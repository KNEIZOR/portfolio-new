import { mkdir } from 'node:fs/promises';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

await prisma.$connect();
await mkdir(env.uploadDir, { recursive: true });
const cleanup = () => prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch((error) => console.error('Session cleanup failed', error));
await cleanup();
const cleanupInterval = setInterval(() => void cleanup(), 6 * 60 * 60 * 1000);
cleanupInterval.unref();

const server = app.listen(env.port, () => console.log('DENIS.DEV API listening on port ' + env.port));

async function shutdown() {
  clearInterval(cleanupInterval);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
