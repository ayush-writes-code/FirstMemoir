import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storageService } from '../services/storage.service.js';
import { successResponse } from '../utils/response.js';
import type { StorageVisibility } from '../services/storage/storage.interface.js';

// ---------------------------------------------------------------------------
// MIME type whitelist
// ---------------------------------------------------------------------------
// Only these types may be uploaded to R2. The backend validates this before
// generating a policy — the bucket-level condition enforces it at upload time.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// ---------------------------------------------------------------------------
// Upload size limits — determined internally, never by the caller.
// ---------------------------------------------------------------------------
const MAX_SIZE_BYTES: Record<StorageVisibility, number> = {
  public:  5  * 1024 * 1024, // 5 MB  — product assets (admin-controlled)
  private: 50 * 1024 * 1024, // 50 MB — customer photos (print-quality)
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
export const requestUploadPolicySchema = {
  body: z.object({
    file_name: z.string().trim().min(1).max(255),
    mime_type: z.string().trim().min(1),
    visibility: z.enum(['public', 'private']),
  }),
};

export const requestReadUrlSchema = {
  query: z.object({
    file_key: z.string().trim().min(1),
  }),
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
// NOTE: There is intentionally no deleteFile endpoint here.
//
// File deletion is a domain operation, not a raw storage operation.
// - Product image deletion happens inside ProductService when an admin
//   replaces or removes a product image. Ownership is established there.
// - Customer photo cleanup for abandoned uploads is handled by an R2
//   Lifecycle Rule (24-hour expiry on the customers/ prefix), not by API.
//
// storageService.deleteFile() remains available for internal use by domain
// services. It is never exposed over HTTP.
// ---------------------------------------------------------------------------
export const storageController = {
  /**
   * POST /api/v1/storage/upload-policy
   *
   * Returns a pre-signed POST policy that the client uses to upload a file
   * directly to R2 — no file data passes through the backend.
   */
  async requestUploadPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { file_name, mime_type, visibility } = req.body as {
        file_name: string;
        mime_type: string;
        visibility: StorageVisibility;
      };

      // Backend whitelist check — reject unsupported types before calling R2.
      if (!ALLOWED_MIME_TYPES.has(mime_type)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: `Unsupported file type '${mime_type}'. Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
        });
      }

      const maxSizeBytes = MAX_SIZE_BYTES[visibility];

      const policy = await storageService.generateUploadPostPolicy(
        file_name,
        mime_type,
        visibility,
        maxSizeBytes,
      );

      res.status(201).json(successResponse({
        upload_url:     policy.url,
        fields:         policy.fields,
        file_key:       policy.fileKey,
        public_url:     policy.publicUrl ?? null,
        expires_in:     300, // seconds
        max_size_bytes: maxSizeBytes,
      }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/storage/read-url
   *
   * Returns a short-lived pre-signed URL for a private customer photo.
   * Authenticated users can access this endpoint — deeper per-asset
   * authorization (e.g. ownership checks) will be added when customer
   * orders are implemented.
   */
  async requestReadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { file_key } = req.query as { file_key: string };

      const signedUrl = await storageService.generateReadUrl(file_key);

      res.status(200).json(successResponse({
        signed_url: signedUrl,
        file_key,
        expires_in: 3600, // 1 hour
      }));
    } catch (error) {
      next(error);
    }
  },
};
