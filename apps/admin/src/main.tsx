import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { setApiUrl } from '@repo/api-client';

const rawApiUrl = import.meta.env.VITE_API_URL;

function resolveAdminApiUrl(): string {
  if (rawApiUrl) {
    try {
      const parsed = new URL(rawApiUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return rawApiUrl.replace(/\/+$/, '');
      }
    } catch {
      throw new Error(`[Configuration Error] VITE_API_URL is invalid: '${rawApiUrl}'. Must be a valid HTTP or HTTPS URL.`);
    }
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api/v1';
  }

  throw new Error(
    '[Configuration Error] VITE_API_URL is required for production builds. Silent fallback to staging/production is disabled for safety.'
  );
}

let apiUrl: string | null = null;
let configError: string | null = null;

try {
  apiUrl = resolveAdminApiUrl();
  setApiUrl(apiUrl);
} catch (err: unknown) {
  configError = err instanceof Error ? err.message : 'Unknown configuration error';
  console.error(configError);
}

const rootEl = document.getElementById('root')!;

if (configError) {
  createRoot(rootEl).render(
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: '#FEF2F2',
      color: '#991B1B',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '560px',
        backgroundColor: '#FFFFFF',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #FCA5A5'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#B91C1C' }}>
          Admin Configuration Error
        </h1>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#374151', marginBottom: '16px' }}>
          {configError}
        </p>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
          Please configure the <code>VITE_API_URL</code> environment variable in your Vercel project settings (e.g. <code>https://firstmemoir-api-staging.onrender.com/api/v1</code> for staging or the production API URL).
        </p>
      </div>
    </div>
  );
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
