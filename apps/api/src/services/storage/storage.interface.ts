export type StorageVisibility = 'public' | 'private';

export interface PresignedPostResponse {
  /** The R2 endpoint URL to POST the multipart/form-data to */
  url: string;
  /** Signed fields that must be included in the FormData alongside the file */
  fields: Record<string, string>;
  /** The storage key to reference this asset in subsequent API calls */
  fileKey: string;
  /**
   * CDN-friendly URL for public assets.
   * Only present when visibility is 'public'.
   */
  publicUrl?: string;
}

export interface IStorageProvider {
  /**
   * Generates a pre-signed POST policy for a direct browser-to-R2 upload.
   * The caller must POST to `url` using FormData with all `fields` included
   * before appending the file.
   *
   * File size and MIME type limits are enforced server-side inside the policy.
   * The caller does NOT control these limits.
   */
  generateUploadPostPolicy(
    fileName: string,
    mimeType: string,
    visibility: StorageVisibility,
    maxSizeBytes: number,
  ): Promise<PresignedPostResponse>;

  /**
   * Generates a short-lived pre-signed URL for reading a private file.
   * Use for customer-uploaded photos that must not be publicly accessible.
   *
   * @param fileKey  The storage key returned during upload.
   * @param expiresIn Expiry in seconds. Defaults to 3600 (1 hour).
   */
  generateReadUrl(fileKey: string, expiresIn?: number): Promise<string>;

  /**
   * Verifies that an object exists in storage and matches the required constraints.
   * Uses HeadObjectCommand to fetch metadata.
   * 
   * @returns The object's metadata (Content-Type, Content-Length) if valid.
   * @throws 400 error if constraints are violated.
   * @throws 502 error if R2 is unreachable.
   * @throws 404 error if object does not exist.
   */
  verifyFile(fileKey: string, options: {
    expectedPrefix: string;
    allowedMimeTypes: Set<string>;
    maxSizeBytes: number;
  }): Promise<{ contentType: string; contentLength: number }>;

  /**
   * Permanently removes a file from storage.
   * Silently succeeds if the file does not exist (idempotent).
   */
  deleteFile(fileKey: string): Promise<void>;
}
