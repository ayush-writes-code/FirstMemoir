import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDropzoneError } from '../components/FileUploader';
import { ErrorCode, type FileRejection } from 'react-dropzone';

function createMockRejection(code: string, message: string): FileRejection {
  return {
    file: {
      name: 'photo.jpg',
      size: 1024,
      type: 'image/jpeg',
      lastModified: Date.now(),
      slice: () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => '',
      stream: () => new ReadableStream(),
      path: '/tmp/photo.jpg',
      relativePath: 'photo.jpg',
    } as unknown as FileRejection['file'],
    errors: [{ code, message }],
  };
}

describe('Customer Photo Upload Flow & Rejection Handling Tests', () => {
  it('formats FileTooLarge rejection with clear 50MB user warning', () => {
    const rejection = createMockRejection(ErrorCode.FileTooLarge, 'File is larger than 52428800 bytes');
    const message = formatDropzoneError(rejection);
    assert.strictEqual(
      message,
      'Photo exceeds the 50MB limit. Please select a smaller photo.',
      'FileTooLarge must produce an actionable message referencing the 50MB limit'
    );
  });

  it('formats FileInvalidType rejection for unsupported formats (HEIC, TIFF, PDF, etc.)', () => {
    const rejection = createMockRejection(ErrorCode.FileInvalidType, 'File type must be image/jpeg, image/png, image/webp');
    const message = formatDropzoneError(rejection);
    assert.strictEqual(
      message,
      'Unsupported format. Please upload a JPEG, PNG, or WebP photo.',
      'FileInvalidType must clearly specify the supported image types'
    );
  });

  it('formats TooManyFiles rejection when user attempts multi-file drop', () => {
    const rejection = createMockRejection(ErrorCode.TooManyFiles, 'Too many files');
    const message = formatDropzoneError(rejection);
    assert.strictEqual(
      message,
      'Please upload only one photo at a time.',
      'TooManyFiles must instruct the user to upload a single photo'
    );
  });

  it('formats FileTooSmall rejection when 0-byte or empty file is selected', () => {
    const rejection = createMockRejection(ErrorCode.FileTooSmall, 'File is smaller than 1 bytes');
    const message = formatDropzoneError(rejection);
    assert.strictEqual(
      message,
      'The selected file is empty. Please select a valid photo.',
      'FileTooSmall must indicate the file is empty'
    );
  });

  it('falls back gracefully to the raw error message or default text for unexpected codes', () => {
    const rejectionWithMsg = createMockRejection('unknown-error-code', 'Custom browser read error');
    assert.strictEqual(
      formatDropzoneError(rejectionWithMsg),
      'Custom browser read error',
      'Should use error.message if present'
    );

    const rejectionWithoutMsg = createMockRejection('unknown-error-code', '');
    assert.strictEqual(
      formatDropzoneError(rejectionWithoutMsg),
      'Unable to accept this photo.',
      'Should use fallback when message is empty'
    );
  });
});
