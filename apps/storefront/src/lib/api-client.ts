import { setApiUrl } from '@repo/api-client';

setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1');

export * from '@repo/api-client';
