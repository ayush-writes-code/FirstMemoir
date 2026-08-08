'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage as storageApi } from '@repo/api-client';

export type UploadState = 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface FileUploaderProps {
  onUploadSuccess: (uploadId: string, previewUrl: string, width: number, height: number) => void;
  onUploadReset: () => void;
}

export function FileUploader({ onUploadSuccess, onUploadReset }: FileUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadState('UPLOADING');
    setErrorMessage(null);

    try {
      const urlRes = await storageApi.getUploadUrl({
        file_name: file.name,
        mime_type: file.type,
        visibility: 'private',
      });

      if (!urlRes.success || !urlRes.data) {
        throw new Error(urlRes.error || 'Failed to get upload URL');
      }

      const { upload_url, file_key } = urlRes.data;

      // 2. PUT directly to R2
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!putRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setUploadState('PROCESSING');

      // 3. Complete Upload
      const completeRes = await storageApi.uploadComplete({
        file_key,
        original_filename: file.name,
      });

      if (!completeRes.success || !completeRes.data) {
        throw new Error(completeRes.error || 'Failed to complete upload');
      }

      setUploadState('READY');
      setPreviewUrl(completeRes.data.preview_url);
      onUploadSuccess(completeRes.data.upload_id, completeRes.data.preview_url, completeRes.data.width, completeRes.data.height);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during upload.';
      setUploadState('FAILED');
      setErrorMessage(errorMessage);
    }
  }, [onUploadSuccess]);

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
  });

  if (uploadState === 'READY' && previewUrl) {
    return (
      <div className="w-full relative rounded-lg border border-hairline overflow-hidden bg-canvas">
        <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-[400px]" />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-pill px-3 py-1.5 shadow-sm flex items-center gap-1.5 border border-hairline text-sm font-medium text-success">
          <CheckCircle2 size={16} />
          Ready
        </div>
        <button 
          onClick={() => {
            setUploadState('IDLE');
            setPreviewUrl(null);
            onUploadReset();
          }}
          className="absolute bottom-2 right-2 bg-white/90 hover:bg-white backdrop-blur rounded-pill px-4 py-2 shadow-sm text-sm font-medium transition-colors border border-hairline text-ink"
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
        flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-brand bg-brand/5' : 'border-hairline bg-canvas hover:border-brand/50 hover:bg-brand/5'}
        ${(uploadState === 'UPLOADING' || uploadState === 'PROCESSING') ? 'pointer-events-none' : ''}
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

      {(uploadState === 'UPLOADING' || uploadState === 'PROCESSING') && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="text-brand font-medium">
            {uploadState === 'UPLOADING' ? 'Uploading photo...' : 'Optimizing photo...'}
          </p>
        </div>
      )}

      {uploadState === 'FAILED' && (
        <>
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-4">
            <AlertCircle size={24} />
          </div>
          <p className="text-error font-medium mb-1">Upload failed</p>
          <p className="text-muted text-sm">{errorMessage}</p>
          <p className="text-brand text-sm font-medium mt-2">Click to try again</p>
        </>
      )}
    </div>
  );
}
