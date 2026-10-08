import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { env } from '../../config/env.js';
import type {
  IStorageProvider,
  PresignedUploadResponse,
  StorageVisibility,
} from './storage.interface.js';

/**
 * Cloudflare R2 storage provider.
 */

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function buildFileKey(fileName: string, visibility: StorageVisibility): string {
  const ext = path.extname(fileName).toLowerCase() || '';
  const uuid = randomUUID();
  const timestamp = Date.now();

  const prefix = visibility === 'public' ? 'products' : 'customers';
  return `${prefix}/${timestamp}-${uuid}${ext}`;
}

export function validateAndGetBucket(fileKey: string): { bucket: string; visibility: StorageVisibility } {
  if (fileKey.startsWith('customers/') || fileKey.startsWith('previews/')) {
    return { bucket: env.R2_PRIVATE_BUCKET_NAME, visibility: 'private' };
  }
  if (fileKey.startsWith('products/')) {
    return { bucket: env.R2_PUBLIC_BUCKET_NAME, visibility: 'public' };
  }
  throw new Error(`Invalid or unauthorized storage key prefix for '${fileKey}'. Must be customers/, products/, or previews/.`);
}

export const r2Provider: IStorageProvider = {
  getPublicUrl(fileKey: string): string {
    const { visibility } = validateAndGetBucket(fileKey);
    if (visibility !== 'public') {
      throw new Error(`Forbidden: Cannot generate public URL for private object '${fileKey}'.`);
    }
    return `${env.R2_PUBLIC_URL}/${fileKey}`;
  },

  async generateUploadUrl(
    fileName: string,
    mimeType: string,
    visibility: StorageVisibility,
    maxSizeBytes: number,
  ): Promise<PresignedUploadResponse> {
    const fileKey = buildFileKey(fileName, visibility);
    const { bucket } = validateAndGetBucket(fileKey);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 300 });

    const result: PresignedUploadResponse = { url, fileKey };

    if (visibility === 'public') {
      result.publicUrl = r2Provider.getPublicUrl(fileKey);
    }

    return result;
  },

  async generateReadUrl(fileKey: string, expiresIn = 3600, downloadFilename?: string): Promise<string> {
    const { bucket } = validateAndGetBucket(fileKey);
    const input: any = {
      Bucket: bucket,
      Key: fileKey,
    };
    if (downloadFilename) {
      input.ResponseContentDisposition = `attachment; filename="${downloadFilename}"`;
    }

    const command = new GetObjectCommand(input);

    return getSignedUrl(client, command, { expiresIn });
  },

  async verifyFile(fileKey: string, options: { expectedPrefix: string; allowedMimeTypes: Set<string>; maxSizeBytes: number; }) {
    if (!fileKey.startsWith(options.expectedPrefix)) {
      throw { statusCode: 400, message: `File key must start with '${options.expectedPrefix}'` };
    }

    const { bucket } = validateAndGetBucket(fileKey);

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      });
      const response = await client.send(command);

      const contentType = response.ContentType || 'application/octet-stream';
      const contentLength = response.ContentLength || 0;

      if (!options.allowedMimeTypes.has(contentType)) {
        throw { statusCode: 400, message: `Invalid content type: ${contentType}` };
      }

      if (contentLength > options.maxSizeBytes) {
        throw { statusCode: 400, message: `File size exceeds the maximum limit of ${options.maxSizeBytes} bytes` };
      }

      return { contentType, contentLength };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        throw { statusCode: 404, message: 'The specified file does not exist in storage' };
      }
      // Re-throw to be caught by global error handler (which maps AWS metadata errors to 502)
      throw error;
    }
  },

  async deleteFile(fileKey: string): Promise<void> {
    const { bucket } = validateAndGetBucket(fileKey);
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });

    await client.send(command);
  },

  async downloadFile(fileKey: string): Promise<Buffer> {
    const { bucket } = validateAndGetBucket(fileKey);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });
    const response = await client.send(command);
    if (!response.Body) throw new Error('Empty body');
    const chunks = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  },

  async uploadBuffer(fileKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    const { bucket } = validateAndGetBucket(fileKey);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: mimeType,
    });
    await client.send(command);
  }
};
