import { setApiUrl } from '@repo/api-client';

const DEFAULT_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://firstmemoir-api-staging.onrender.com/api/v1'
  : 'http://localhost:3001/api/v1';

setApiUrl(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);

export * from '@repo/api-client';
