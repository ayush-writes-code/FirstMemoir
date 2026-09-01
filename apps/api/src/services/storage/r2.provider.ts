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

export const r2Provider: IStorageProvider = {
  async generateUploadUrl(
    fileName: string,
    mimeType: string,
    visibility: StorageVisibility,
    maxSizeBytes: number,
  ): Promise<PresignedUploadResponse> {
    const fileKey = buildFileKey(fileName, visibility);

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 300 });

    const result: PresignedUploadResponse = { url, fileKey };

    if (visibility === 'public') {
      result.publicUrl = `${env.R2_PUBLIC_URL}/${fileKey}`;
    }

    return result;
  },

  async generateReadUrl(fileKey: string, expiresIn = 3600, downloadFilename?: string): Promise<string> {
    const input: any = {
      Bucket: env.R2_BUCKET_NAME,
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

    try {
      const command = new HeadObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
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
    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
    });

    await client.send(command);
  },

  async downloadFile(fileKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
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
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: mimeType,
    });
    await client.send(command);
  }
};
