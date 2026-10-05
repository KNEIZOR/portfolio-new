import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
  : process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : undefined;
const publicOrigin = process.env.PUBLIC_ORIGIN ?? vercelOrigin ?? 'http://localhost:5173';
const origins = (process.env.ALLOWED_ORIGINS ?? publicOrigin)
  .split(',').map((value) => value.trim()).filter(Boolean);

export const env = {
  nodeEnv,
  production: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET'),
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD,
  publicOrigin,
  allowedOrigins: origins,
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 12),
  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  s3Endpoint: process.env.S3_ENDPOINT || undefined,
  s3Region: process.env.S3_REGION ?? 'auto',
  s3Bucket: process.env.S3_BUCKET,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
};

if (env.production && env.sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production.');
}
if (!['local', 's3'].includes(env.storageProvider)) {
  throw new Error('STORAGE_PROVIDER must be local, s3, or vercel-blob.');
}
if (env.storageProvider === 's3' && !(env.s3Bucket && env.s3AccessKeyId && env.s3SecretAccessKey && env.s3PublicBaseUrl)) {
  throw new Error('S3 storage requires bucket, credentials, and S3_PUBLIC_BASE_URL.');
}
if (env.storageProvider === 'vercel-blob' && !process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('Vercel Blob storage requires BLOB_READ_WRITE_TOKEN.');
}
