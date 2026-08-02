import { useRef, useState, useEffect } from 'react';
import { storage, products as productsApi } from '@repo/api-client';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PUBLIC_IMAGE_SIZE_BYTES,
} from '@repo/shared';
import { UploadCloud, AlertCircle } from 'lucide-react';

// Human-readable helpers derived from the shared constants.
const ALLOWED_MIME_LABEL = ALLOWED_IMAGE_MIME_TYPES.map((t) =>
  t.replace('image/', '').toUpperCase(),
).join(', ');
const MAX_SIZE_MB = MAX_PUBLIC_IMAGE_SIZE_BYTES / (1024 * 1024);

type UploadState = 'idle' | 'uploading' | 'confirming' | 'error';

interface Props {
  productId: string;
  onUploadComplete: () => void;
}

export function ProductImageUpload({ productId, onUploadComplete }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the AbortController so we can cancel an in-flight R2 upload on unmount.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Guard against state updates after unmount.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort any in-flight R2 upload when the component unmounts (e.g. modal closed).
      abortControllerRef.current?.abort();
    };
  }, []);

  const isUploading = uploadState === 'uploading' || uploadState === 'confirming';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent a second upload while one is already running.
    if (isUploading) return;

    const file = e.target.files?.[0];
    // Reset the input value so the same file can be retried after an error.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    // ── Client-side validation (using shared constants) ──────────────────────
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setUploadState('error');
      setErrorMessage(
        `Unsupported file type "${file.type}". Allowed: ${ALLOWED_MIME_LABEL}.`,
      );
      return;
    }
    if (file.size > MAX_PUBLIC_IMAGE_SIZE_BYTES) {
      setUploadState('error');
      setErrorMessage(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed: ${MAX_SIZE_MB} MB.`,
      );
      return;
    }

    // ── Step 1: Request a presigned upload URL ────────────────────────────────
    setUploadState('uploading');
    setErrorMessage('');

    const urlRes = await storage.getUploadUrl({
      file_name: file.name,
      mime_type: file.type,
      visibility: 'public',
    });

    if (!isMountedRef.current) return;

    if (!urlRes.success || !urlRes.data) {
      setUploadState('error');
      setErrorMessage(urlRes.error ?? 'Failed to request upload URL.');
      return;
    }

    const { upload_url, file_key } = urlRes.data;

    // ── Step 2: PUT the file directly to R2 ──────────────────────────────────
    // IMPORTANT: Do NOT include Authorization or Cookie headers here.
    // The presigned URL already carries all credentials via query parameters.
    abortControllerRef.current = new AbortController();
    let r2Ok = false;
    try {
      const r2Response = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
        signal: abortControllerRef.current.signal,
      });
      r2Ok = r2Response.ok;
    } catch (err) {
      if (!isMountedRef.current) return; // Aborted due to unmount — silently exit.
      setUploadState('error');
      setErrorMessage('Storage upload failed. Please try again.');
      return;
    }

    if (!isMountedRef.current) return;

    if (!r2Ok) {
      setUploadState('error');
      setErrorMessage('Storage upload failed. Please try again.');
      return;
    }

    // ── Step 3: Confirm the upload ────────────────────────────────────────────
    setUploadState('confirming');

    const confirmRes = await productsApi.confirmProductImage(productId, {
      file_key,
    });

    if (!isMountedRef.current) return;

    if (!confirmRes.success) {
      setUploadState('error');
      setErrorMessage(
        confirmRes.error ??
          'Upload succeeded but server verification failed. Please try again.',
      );
      return;
    }

    // ── Step 4: Success — trigger refetch ─────────────────────────────────────
    setUploadState('idle');
    onUploadComplete();
  };

  const handleButtonClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
        className="hidden"
        disabled={isUploading}
        onChange={handleFileChange}
        id={`image-upload-${productId}`}
        aria-label="Upload product image"
      />

      {/* Upload trigger button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#E8620A] hover:text-[#E8620A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploadState === 'uploading' && (
          <>
            <span className="inline-block h-4 w-4 border-2 border-[#E8620A] border-t-transparent rounded-full animate-spin" />
            Uploading to storage…
          </>
        )}
        {uploadState === 'confirming' && (
          <>
            <span className="inline-block h-4 w-4 border-2 border-[#E8620A] border-t-transparent rounded-full animate-spin" />
            Confirming upload…
          </>
        )}
        {(uploadState === 'idle' || uploadState === 'error') && (
          <>
            <UploadCloud className="h-4 w-4" />
            Upload Image
          </>
        )}
      </button>

      {/* Helper text */}
      {uploadState !== 'error' && (
        <p className="text-xs text-gray-400 text-center">
          {ALLOWED_MIME_LABEL} · Max {MAX_SIZE_MB} MB
        </p>
      )}

      {/* Error message */}
      {uploadState === 'error' && errorMessage && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
