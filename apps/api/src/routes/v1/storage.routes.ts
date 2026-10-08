import { Router } from 'express';
import {
  storageController,
  requestUploadUrlSchema,
  requestReadUrlSchema,
} from '../../controllers/storage.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { ensureCartSession } from '../../middlewares/session.middleware.js';

const router = Router();

/**
 * POST /api/v1/storage/upload-url
 *
 * Any authenticated user can request an upload URL.
 * - Admins use it to upload product images (public).
 * - Customers will use it to upload print photos (private).
 *
 * Visibility and size limits are enforced by the controller, not the caller.
 *
 * NOTE: There is no DELETE /storage endpoint.
 * File deletion is always a side effect of a domain operation:
 * - Product image replacement/removal → handled inside ProductService.
 * - Abandoned customer uploads → cleaned up by an R2 Lifecycle Rule.
 */
router.post(
  '/upload-url',
  ensureCartSession, // Only requires cart session, which is anonymous. Authenticated users also have a cart session.
  validate(requestUploadUrlSchema),
  storageController.requestUploadUrl,
);

/**
 * GET /api/v1/storage/read-url
 *
 * Any session or authenticated user can retrieve a short-lived read URL for their own private asset.
 * Enforces strict per-asset ownership checks bound to session or user.
 */
router.get(
  '/read-url',
  ensureCartSession,
  validate(requestReadUrlSchema),
  storageController.requestReadUrl,
);
/**
 * GET /api/v1/storage/preview/:file_key(*)
 *
 * Redirects to a short-lived pre-signed URL for an image.
 */
router.get(
  '/preview/*',
  ensureCartSession,
  storageController.streamPreview,
);
/**
 * POST /api/v1/storage/upload-complete
 *
 * Notify the server that an upload is complete.
 */
router.post(
  '/upload-complete',
  ensureCartSession, // Requires cart session (anonymous or authenticated)
  storageController.uploadComplete,
);

export default router;
