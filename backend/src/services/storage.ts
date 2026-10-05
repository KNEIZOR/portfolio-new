import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
export interface StorageService {
  save(buffer: Buffer, mime: ImageMime): Promise<string>;
  remove(url: string): Promise<void>;
}

const extension = '.webp';

async function optimizedWebp(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new HttpError(415, 'The image could not be decoded.', 'INVALID_IMAGE');
  }
}

class LocalStorage implements StorageService {
  async save(buffer: Buffer, _mime: ImageMime) {
    const optimized = await optimizedWebp(buffer);
    await mkdir(env.uploadDir, { recursive: true });
    const filename = randomUUID() + extension;
    await writeFile(path.join(env.uploadDir, filename), optimized, { flag: 'wx' });
    return '/uploads/' + filename;
  }
  async remove(url: string) {
    if (!url.startsWith('/uploads/')) return;
    const filename = path.basename(url);
    if (filename !== url.slice('/uploads/'.length)) return;
    await unlink(path.join(env.uploadDir, filename)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

class S3Storage implements StorageService {
  private client = new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint,
    forcePathStyle: env.s3ForcePathStyle,
    credentials: { accessKeyId: env.s3AccessKeyId!, secretAccessKey: env.s3SecretAccessKey! },
  });
  async save(buffer: Buffer, _mime: ImageMime) {
    const optimized = await optimizedWebp(buffer);
    const key = randomUUID() + extension;
    await this.client.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: optimized, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
    return env.s3PublicBaseUrl!.replace(/\/$/, '') + '/' + key;
  }
  async remove(url: string) {
    const base = env.s3PublicBaseUrl!.replace(/\/$/, '') + '/';
    if (!url.startsWith(base)) return;
    const key = url.slice(base.length);
    if (!key || key.includes('..') || key.includes('/')) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }));
  }
}

export const storage: StorageService = env.storageProvider === 's3' ? new S3Storage() : new LocalStorage();
