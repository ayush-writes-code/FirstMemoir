import { fetchClient } from '../client';
import type { ApiResponse, StorageVisibility, PresignedUploadResponse } from '../types';

/**
 * Request a short-lived presigned upload URL from the backend.
 */
export const getUploadUrl = (input: {
  file_name: string;
  mime_type: string;
  visibility: StorageVisibility;
}): Promise<ApiResponse<PresignedUploadResponse>> => {
  return fetchClient<PresignedUploadResponse>('/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Request a short-lived read URL for a private file.
 */
export const getReadUrl = (fileKey: string): Promise<ApiResponse<{ url: string }>> => {
  return fetchClient<{ url: string }>(`/storage/read-url?fileKey=${encodeURIComponent(fileKey)}`, {
    method: 'GET',
  });
};

/**
 * Notify the server that an upload is complete.
 */
export const uploadComplete = (input: {
  file_key: string;
  original_filename: string;
}): Promise<ApiResponse<{ upload_id: string; status: string; preview_url: string; width: number; height: number }>> => {
  return fetchClient<{ upload_id: string; status: string; preview_url: string; width: number; height: number }>('/storage/upload-complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};
