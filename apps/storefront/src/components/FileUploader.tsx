'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone, ErrorCode, type FileRejection } from 'react-dropzone';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage as storageApi } from '@/lib/api-client';

export type UploadState = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface FileUploaderProps {
  onUploadSuccess: (uploadId: string, previewUrl: string, width: number, height: number) => void;
  onUploadReset: () => void;
}

/**
 * Maps dropzone rejection error codes into clear, user-facing error messages.
 */
export function formatDropzoneError(rejection: FileRejection): string {
  const error = rejection.errors[0];
  if (!error) return 'Invalid file selected.';

  switch (error.code) {
    case ErrorCode.FileTooLarge:
      return 'Photo exceeds the 50MB limit. Please select a smaller photo.';
    case ErrorCode.FileInvalidType:
      return 'Unsupported format. Please upload a JPEG, PNG, or WebP photo.';
    case ErrorCode.TooManyFiles:
      return 'Please upload only one photo at a time.';
    case ErrorCode.FileTooSmall:
      return 'The selected file is empty. Please select a valid photo.';
    default:
      return error.message || 'Unable to accept this photo.';
  }
}

export function FileUploader({ onUploadSuccess, onUploadReset }: FileUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('IDLE');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const handleCancelUpload = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isCancelledRef.current = true;
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setUploadState('IDLE');
    setUploadProgress(0);
    setErrorMessage(null);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // 1. Client-side rejection handling (size > 50MB, unsupported mime types, multiple files)
      if (fileRejections && fileRejections.length > 0) {
        const errorMsg = formatDropzoneError(fileRejections[0]!);
        setUploadState('FAILED');
        setErrorMessage(errorMsg);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      isCancelledRef.current = false;
      setUploadState('UPLOADING');
      setUploadProgress(0);
      setErrorMessage(null);

      try {
        // Step 1: Request presigned upload URL from backend
        const urlRes = await storageApi.getUploadUrl({
          file_name: file.name,
          mime_type: file.type,
          visibility: 'private',
        });

        if (isCancelledRef.current) return;

        if (!urlRes.success || !urlRes.data) {
          throw new Error(urlRes.error || 'Failed to initialize secure upload');
        }

        const { upload_url, file_key } = urlRes.data;

        // Step 2: PUT directly to Cloudflare R2 with progress tracking
        if (typeof XMLHttpRequest !== 'undefined') {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhrRef.current = xhr;

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && !isCancelledRef.current) {
                const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
                setUploadProgress(percent);
              }
            };

            xhr.onload = () => {
              activeXhrRef.current = null;
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Storage rejected upload (HTTP ${xhr.status})`));
              }
            };

            xhr.onerror = () => {
              activeXhrRef.current = null;
              reject(new Error('Network error during file upload. Please check your connection.'));
            };

            xhr.onabort = () => {
              activeXhrRef.current = null;
              reject(new Error('Upload was cancelled.'));
            };

            xhr.open('PUT', upload_url);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
          });
        } else {
          // Fallback for headless / Node.js testing environments without XMLHttpRequest
          const putRes = await fetch(upload_url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });

          if (!putRes.ok) {
            throw new Error(`Failed to upload file to storage (HTTP ${putRes.status})`);
          }
        }

        if (isCancelledRef.current) return;

        setUploadState('PROCESSING');
        setUploadProgress(100);

        // Step 3: Complete upload on backend (EXIF rotation, Sharp preview generation, DB record)
        const completeRes = await storageApi.uploadComplete({
          file_key,
          original_filename: file.name,
        });

        if (isCancelledRef.current) return;

        if (!completeRes.success || !completeRes.data) {
          throw new Error(completeRes.error || 'Failed to process photo for print');
        }

        setUploadState('READY');
        setPreviewUrl(completeRes.data.preview_url);
        onUploadSuccess(
          completeRes.data.upload_id,
          completeRes.data.preview_url,
          completeRes.data.width,
          completeRes.data.height,
        );
      } catch (err: unknown) {
        if (isCancelledRef.current) {
          return;
        }
        console.error('Photo upload error:', err);
        const errorText = err instanceof Error ? err.message : 'Unknown error during photo upload.';
        setUploadState('FAILED');
        setErrorMessage(errorText);
      }
    },
    [onUploadSuccess],
  );

  const isUploadingOrProcessing = uploadState === 'UPLOADING' || uploadState === 'PROCESSING';

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50MB matches backend MAX_PRIVATE_IMAGE_SIZE_BYTES
    disabled: isUploadingOrProcessing,
  });

  if (uploadState === 'READY' && previewUrl) {
    return (
      <div className="w-full flex items-center justify-between bg-surface-soft p-3 rounded-lg border border-hairline mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 size={16} />
          Photo Uploaded
        </div>
        <button
          type="button"
          onClick={() => {
            setUploadState('IDLE');
            setPreviewUrl(null);
            setUploadProgress(0);
            onUploadReset();
          }}
          className="bg-white hover:bg-neutral-50 rounded-pill px-4 py-1.5 shadow-sm text-sm font-medium transition-colors border border-hairline text-ink"
        >
          Change Photo
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        relative w-full h-48 md:h-64 rounded-xl border-2 border-dashed 
        flex flex-col items-center justify-center p-6 text-center transition-all
        ${isDragActive ? 'border-brand bg-brand/5' : 'border-hairline bg-canvas hover:border-brand/50 hover:bg-brand/5'}
        ${isUploadingOrProcessing ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      <input {...getInputProps()} />

      {uploadState === 'IDLE' && (
        <>
          <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-4">
            <UploadCloud size={24} />
          </div>
          <p className="text-ink font-medium mb-1">Click or drag photo to upload</p>
          <p className="text-muted text-sm">JPEG, PNG, or WebP up to 50MB</p>
        </>
      )}

      {uploadState === 'UPLOADING' && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs px-4">
          <Loader2 className="animate-spin text-brand mb-1" size={32} />
          <p className="text-ink font-medium text-sm">
            Uploading photo{uploadProgress > 0 ? ` (${uploadProgress}%)` : '...'}
          </p>
          <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand h-full transition-all duration-150 rounded-full"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleCancelUpload}
            className="mt-2 text-xs text-muted hover:text-ink underline transition-colors focus:outline-none"
          >
            Cancel upload
          </button>
        </div>
      )}

      {uploadState === 'PROCESSING' && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="text-brand font-medium text-sm">Optimizing photo for print...</p>
          <p className="text-xs text-muted">Normalizing orientation and resolution</p>
        </div>
      )}

      {uploadState === 'FAILED' && (
        <div className="flex flex-col items-center px-4">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-3">
            <AlertCircle size={24} />
          </div>
          <p className="text-error font-medium text-sm mb-1">Upload failed</p>
          <p className="text-muted text-xs max-w-sm text-center leading-relaxed mb-3">
            {errorMessage || 'An error occurred while uploading. Please try again.'}
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-pill bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition-colors">
            Choose another photo
          </span>
        </div>
      )}
    </div>
  );
}
