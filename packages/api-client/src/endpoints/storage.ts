import { fetchClient } from '../client';
import type { ApiResponse, StorageVisibility, PresignedPostResponse } from '../types';

/**
 * Request a short-lived presigned upload URL from the backend.
 */
export const getUploadPolicy = (input: {
  fileName: string;
  mimeType: string;
  visibility: StorageVisibility;
}): Promise<ApiResponse<PresignedPostResponse>> => {
  return fetchClient<PresignedPostResponse>('/storage/upload-policy', {
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
