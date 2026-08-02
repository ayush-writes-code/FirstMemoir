/**
 * Shared storage validation constants.
 *
 * These are the single source of truth for upload constraints used by both
 * the backend (storage.controller.ts) and the frontend (ProductImageUpload).
 */

/** Allowed MIME types for product image uploads (public visibility). */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Maximum file size for public product image uploads (5 MB). */
export const MAX_PUBLIC_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum file size for private customer photo uploads (50 MB). */
export const MAX_PRIVATE_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;
