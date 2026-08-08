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
 * Any authenticated user can retrieve a short-lived read URL for a private asset.
 * Per-asset ownership checks will be layered on in the Orders milestone.
 */
router.get(
  '/read-url',
  authenticate,
  validate(requestReadUrlSchema),
  storageController.requestReadUrl,
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
