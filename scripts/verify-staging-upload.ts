import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env credentials from apps/api/.env for R2 cleanup
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const STAGING_API = 'https://firstmemoir-api-staging.onrender.com';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME || 'firstmemoir-private-uploads';

async function main() {
  console.log('===============================================================');
  console.log('Slice 6C.5 Stage 2 — Live Staging Upload & Security Verification');
  console.log('===============================================================');
  console.log('Target API:', STAGING_API);
  console.log('Target R2 Bucket (Private):', R2_PRIVATE_BUCKET);
  console.log('Target R2 Public Domain:', R2_PUBLIC_URL);

  // 1. Generate synthetic 100x100 JPEG buffer
  const testBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 180, g: 140, b: 100 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log(`[PASS] Generated synthetic test JPEG: ${testBuffer.length} bytes`);

  // 2. Step A: POST /api/v1/storage/upload-url
  console.log('\n--- Step A: POST /api/v1/storage/upload-url ---');
  const uploadUrlRes = await fetch(`${STAGING_API}/api/v1/storage/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: 'synthetic-stage2-audit-test.jpg',
      mime_type: 'image/jpeg',
      visibility: 'private',
    }),
  });

  const uploadUrlStatus = uploadUrlRes.status;
  const setCookie = uploadUrlRes.headers.get('set-cookie');
  const uploadUrlBody = (await uploadUrlRes.json()) as any;

  console.log('Status:', uploadUrlStatus);
  console.log('Set-Cookie present:', !!setCookie);
  console.log('Response body:', JSON.stringify(uploadUrlBody, null, 2));

  if (uploadUrlStatus !== 201 || !uploadUrlBody.success) {
    throw new Error(`upload-url failed: ${JSON.stringify(uploadUrlBody)}`);
  }

  const { upload_url, file_key, public_url } = uploadUrlBody.data;
  if (!file_key.startsWith('customers/')) {
    throw new Error(`Security violation: file_key must start with customers/, got: ${file_key}`);
  }
  if (public_url !== null) {
    throw new Error(`Security violation: private upload must have public_url = null, got: ${public_url}`);
  }
  console.log(`[PASS] Presigned PUT URL generated with authoritative customers/ prefix: ${file_key}`);
  console.log('[PASS] Invariant verified: public_url is strictly null.');

  // Extract session cookie
  const cartCookie = setCookie ? setCookie.split(';')[0] : '';
  console.log('Extracted Session Cookie:', cartCookie.replace(/=.*/, '=<redacted>'));

  // 3. Step B: Direct PUT to Cloudflare R2 Presigned URL
  console.log('\n--- Step B: Direct PUT to Cloudflare R2 Presigned URL ---');
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
    },
    body: testBuffer,
  });

  console.log('PUT Status:', putRes.status, putRes.statusText);
  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Direct R2 PUT failed (${putRes.status}): ${errText}`);
  }
  console.log('[PASS] Direct R2 binary upload succeeded with HTTP 200.');

  // 4. Step C: POST /api/v1/storage/upload-complete
  console.log('\n--- Step C: POST /api/v1/storage/upload-complete ---');
  const completeRes = await fetch(`${STAGING_API}/api/v1/storage/upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cartCookie,
    },
    body: JSON.stringify({
      file_key,
      original_filename: 'synthetic-stage2-audit-test.jpg',
    }),
  });

  const completeStatus = completeRes.status;
  const completeBody = (await completeRes.json()) as any;
  console.log('Complete Status:', completeStatus);
  console.log('Complete Body:', JSON.stringify(completeBody, null, 2));

  if (completeStatus !== 200 || !completeBody.success) {
    throw new Error(`upload-complete failed: ${JSON.stringify(completeBody)}`);
  }

  const { upload_id, preview_url, width, height, status } = completeBody.data;
  if (status !== 'READY') {
    throw new Error(`Expected status READY, got ${status}`);
  }
  if (width !== 100 || height !== 100) {
    throw new Error(`Expected dimensions 100x100, got ${width}x${height}`);
  }
  console.log(`[PASS] Upload processed. ID: ${upload_id}, State: ${status}, Normalized Dimensions: ${width}x${height}`);

  // 5. Step D: GET /api/v1/storage/preview/:uploadId (Authorized)
  console.log('\n--- Step D: GET /api/v1/storage/preview/:uploadId (Authorized) ---');
  const previewRes = await fetch(preview_url, {
    method: 'GET',
    headers: {
      'Cookie': cartCookie,
    },
    redirect: 'manual',
  });

  console.log('Preview Status:', previewRes.status);
  const locationHeader = previewRes.headers.get('location');
  const cacheControlHeader = previewRes.headers.get('cache-control');
  const referrerPolicyHeader = previewRes.headers.get('referrer-policy');

  console.log('Cache-Control:', cacheControlHeader);
  console.log('Referrer-Policy:', referrerPolicyHeader);
  console.log('Redirect Location present:', !!locationHeader);

  if (previewRes.status !== 302 || !locationHeader) {
    throw new Error(`Preview failed to redirect with 302: status=${previewRes.status}`);
  }
  if (cacheControlHeader !== 'private, no-store') {
    throw new Error(`Preview cache-control must be 'private, no-store', got: ${cacheControlHeader}`);
  }
  console.log('[PASS] Preview endpoint returned 302 Redirect to signed URL with private, no-store.');

  // 6. Step E: Fetch WebP Image from Presigned Redirect Location
  console.log('\n--- Step E: Fetch WebP Preview from Presigned Redirect URL ---');
  const signedImgRes = await fetch(locationHeader);
  console.log('Signed GET Status:', signedImgRes.status);
  const contentType = signedImgRes.headers.get('content-type');
  const imgData = await signedImgRes.arrayBuffer();
  console.log('Content-Type:', contentType, `| Size: ${imgData.byteLength} bytes`);

  if (!signedImgRes.ok || !contentType?.includes('image/webp')) {
    throw new Error(`Failed to download preview WebP image: ${signedImgRes.status} ${contentType}`);
  }
  console.log('[PASS] Preview image verified as WebP binary proxy directly from R2.');

  // 7. Step F: Security Boundary Tests
  console.log('\n--- Step F: Security Boundary Tests (Negative Assertions) ---');

  // F.1: Preview access without session cookie
  const unauthPreviewRes = await fetch(preview_url, {
    method: 'GET',
    redirect: 'manual',
  });
  console.log('F.1 Unauthenticated Preview Status:', unauthPreviewRes.status, '(Expected 403)');
  if (unauthPreviewRes.status !== 403) {
    throw new Error(`Security breach: unauthenticated preview should return 403, got: ${unauthPreviewRes.status}`);
  }

  // F.2: Read-url access without session cookie
  const unauthReadRes = await fetch(`${STAGING_API}/api/v1/storage/read-url?file_key=${encodeURIComponent(file_key)}`, {
    method: 'GET',
  });
  console.log('F.2 Unauthenticated Read-URL Status:', unauthReadRes.status, '(Expected 403)');
  if (unauthReadRes.status !== 403) {
    throw new Error(`Security breach: unauthenticated read-url should return 403, got: ${unauthReadRes.status}`);
  }

  // F.3: Direct Public CDN access on private key
  const publicCdnUrl = `${R2_PUBLIC_URL}/${file_key}`;
  const publicCdnRes = await fetch(publicCdnUrl);
  console.log(`F.3 Direct Public CDN fetch (${publicCdnUrl}) Status:`, publicCdnRes.status, '(Expected 404/403)');
  if (publicCdnRes.ok) {
    throw new Error(`Security breach: private object accessible publicly at ${publicCdnUrl}`);
  }

  // F.4: Idempotency / Double complete rejection
  const duplicateCompleteRes = await fetch(`${STAGING_API}/api/v1/storage/upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cartCookie,
    },
    body: JSON.stringify({
      file_key,
      original_filename: 'synthetic-stage2-audit-test.jpg',
    }),
  });
  console.log('F.4 Duplicate Upload Complete Status:', duplicateCompleteRes.status, '(Expected 409 Conflict)');
  if (duplicateCompleteRes.status !== 409) {
    throw new Error(`State machine violation: duplicate upload-complete should return 409, got: ${duplicateCompleteRes.status}`);
  }
  console.log('[PASS] Security boundaries and state machine verified: all negative tests passed.');

  // 8. Step G: Guaranteed Cleanup
  console.log('\n--- Step G: Guaranteed Cleanup of Synthetic Staging Objects ---');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  const previewKey = `previews/${file_key.split('/').pop()?.split('.')[0]}.webp`;
  console.log(`Deleting raw upload: ${file_key} from ${R2_PRIVATE_BUCKET}`);
  await s3.send(new DeleteObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: file_key,
  }));

  console.log(`Deleting preview proxy: ${previewKey} from ${R2_PRIVATE_BUCKET}`);
  await s3.send(new DeleteObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: previewKey,
  }));

  let rawExists = true;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: file_key }));
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      rawExists = false;
    }
  }

  let previewExists = true;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: previewKey }));
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      previewExists = false;
    }
  }

  console.log(`Cleanup verification: rawExists=${rawExists}, previewExists=${previewExists}`);
  if (rawExists || previewExists) {
    throw new Error('Cleanup failed: objects still exist in R2 bucket!');
  }
  console.log('[PASS] Guaranteed cleanup complete. Zero leftover objects in R2.');

  console.log('\n===============================================================');
  console.log('STAGE 2 VERIFICATION SUMMARY: 100% PASS');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('\n[FAIL] Stage 2 Staging Verification failed:', err);
  process.exit(1);
});
