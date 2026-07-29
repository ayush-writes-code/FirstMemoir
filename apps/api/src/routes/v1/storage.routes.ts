import { Router } from 'express';
import {
  storageController,
  requestUploadPolicySchema,
  requestReadUrlSchema,
} from '../../controllers/storage.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * POST /api/v1/storage/upload-policy
 *
 * Any authenticated user can request an upload policy.
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
  '/upload-policy',
  authenticate,
  validate(requestUploadPolicySchema),
  storageController.requestUploadPolicy,
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

export default router;
