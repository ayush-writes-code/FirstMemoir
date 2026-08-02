# Phase 2 Completion Report: Admin Product Image Upload & Storage Integration

## 1. Overview & Features Implemented
Phase 2 delivers secure, direct-to-storage product image uploading for the WePrintIt admin workspace, shared validation across frontend and backend, deterministic database transaction handling, and storefront image display.

Key Features:
- **Direct S3/R2 Uploads via Presigned URLs**: Image binaries are uploaded directly from the browser to Cloudflare R2 bucket using HTTP `PUT` presigned URLs, bypassing the API server for payload transfer.
- **Shared Validation Package (`@repo/shared`)**: Created a minimal zero-dependency monorepo package exporting canonical MIME type whitelists (`image/jpeg`, `image/png`, `image/webp`) and file size limits (5 MB for public product images, 50 MB for private customer upload assets).
- **Form State Preservation**: Admin product form updates (`ProductForm.tsx`) use identity-based initialization (`product.id`), preserving unsaved text field edits when image data is refetched after a successful upload.
- **Storefront Display**: Storefront configured (`next.config.js`) to dynamically authorize the R2 public hostname for Next.js Image optimization (`next/image`).
- **Defensive Image Handling**: Both backend serialization (`serializeProduct`) and admin UI (`ProductImageList.tsx`) handle missing or undefined image arrays gracefully, defaulting to empty arrays `[]`.

---

## 2. Architectural Decisions
1. **Direct Browser-to-R2 Upload Pattern**:
   - **Step 1**: Admin UI requests a presigned URL from `/api/v1/storage/upload-url`.
   - **Step 2**: Admin UI executes `PUT` directly to Cloudflare R2 with `Content-Type` header (excluding auth cookies or `Authorization` headers).
   - **Step 3**: Admin UI calls `/api/v1/products/:id/images/confirm` to attach the uploaded `file_key` to the product record.
2. **Monorepo Shared Package Architecture**:
   - Package `@repo/shared` registered across `package.json` workspace files for `apps/admin`, `apps/api`, and `packages/api-client`.
   - Enforces single-source-of-truth validation constants without runtime dependencies.
3. **Prisma Interactive Transaction Isolation**:
   - Resolved Prisma `P2028` transaction timeouts by keeping `$transaction` callbacks strictly scoped to write mutations (`update`, `deleteMany`, `createMany`), moving heavy `findUniqueOrThrow` relational reads outside the transaction boundary.

---

## 3. API Endpoints Used & Updated

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/storage/upload-url` | Generates R2 presigned `PUT` upload URL with file key and expiration |
| `POST` | `/api/v1/products/:id/images/confirm` | Confirms uploaded `file_key` and creates `ProductImage` database record |
| `PUT` | `/api/v1/products/:id` | Updates product details and categories |
| `GET` | `/api/v1/products` | Lists products with attached `images` array |
| `GET` | `/api/v1/products/slug/:slug` | Retrieves single product details by slug for storefront |

---

## 4. Files Changed

### Shared & API Client
- `packages/shared/package.json` — New `@repo/shared` package definition
- `packages/shared/src/storage.ts` — Storage constants (`ALLOWED_IMAGE_MIME_TYPES`, `MAX_PUBLIC_IMAGE_SIZE_BYTES`, `MAX_PRIVATE_IMAGE_SIZE_BYTES`)
- `packages/shared/src/index.ts` — Re-export barrel file
- `packages/api-client/package.json` — Linked `@repo/shared` dependency
- `packages/api-client/src/endpoints/products.ts` — Added `getProductBySlug`
- `packages/api-client/src/types.ts` — Presigned upload types standardized (`PresignedUploadResponse`)

### API Server (`apps/api`)
- `apps/api/package.json` — Linked `@repo/shared` dependency
- `apps/api/src/controllers/storage.controller.ts` — Updated to consume `@repo/shared` limits
- `apps/api/src/services/product.service.ts` — Refactored `updateProduct` and `createProduct` transactions; `serializeProduct` image fallback

### Admin Application (`apps/admin`)
- `apps/admin/package.json` — Linked `@repo/shared` dependency
- `apps/admin/src/components/products/ProductImageUpload.tsx` — Direct-to-R2 upload component with client validation and `AbortController` cancellation
- `apps/admin/src/components/products/ProductForm.tsx` — Identity-based reset preservation
- `apps/admin/src/components/products/ProductImageList.tsx` — Defensive image list component
- `apps/admin/src/pages/Products.tsx` — Modal refetch image sync

### Storefront Application (`apps/storefront`)
- `apps/storefront/next.config.js` — Dynamic Cloudflare R2 hostname registration for Next.js Image optimization

---

## 5. Bugs Fixed During Development
1. **Missing Symbol Export in `@repo/shared`**: Registered workspace dependencies and built `@repo/shared` before API compilation.
2. **`TypeError: images is not iterable`**: Fixed missing `images` relation in backend serialization by adding fallback `[]` in `serializeProduct` and defensive check `(images ?? [])` in `ProductImageList.tsx`.
3. **Cloudflare R2 CORS Failure**: Configured Cloudflare R2 CORS rules (`PUT`, `GET`, `HEAD`, `AllowedOrigins: http://localhost:5173`).
4. **Prisma `P2028` Transaction Not Found Error**: Moved heavy relational query `findUniqueOrThrow` outside of the `$transaction` callback to prevent transaction timeout/deadlocks.
5. **Storefront 404 Upstream Image Response**: Identified and deleted ghost database records pointing to non-existent R2 keys created by temporary reproduction scripts.

---

## 6. Manual QA Checklist & Verification Results

| QA Test Case | Result |
|---|---|
| Valid image upload (JPEG, PNG, WebP) | **Passed** ✅ |
| Invalid MIME type rejection (PDF, GIF, etc.) | **Passed** ✅ |
| Oversized file rejection (> 5 MB) | **Passed** ✅ |
| Storage upload failure error message | **Passed** ✅ |
| Confirmation API failure handling | **Passed** ✅ |
| Refetched image appears in gallery | **Passed** ✅ |
| Unsaved form fields intact post-upload | **Passed** ✅ |
| Retry upload after failure | **Passed** ✅ |
| Close modal during in-flight upload (Aborted clean) | **Passed** ✅ |
| Storefront renders uploaded R2 images | **Passed** ✅ |
| Product update transaction determinism | **Passed** ✅ |

---

## 7. Known Limitations & Future Work

### Current Limitations
- Upload currently appends new images; deletion, primary image toggling, and reordering are scheduled for upcoming phases.

### Remaining Work (Upcoming Phases)
- **Phase 3**: Admin Product Image Deletion (Deleting `ProductImage` database record & Cloudflare R2 object).
- **Phase 4**: Primary Image Selection (Setting `is_primary` flag on a product image).
- **Phase 5**: Image Reordering (Drag-and-drop or position ordering logic).
