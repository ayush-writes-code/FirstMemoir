import type { ApiResponse } from './types';

const envApiUrl = typeof globalThis !== 'undefined'
  ? (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NEXT_PUBLIC_API_URL
  : undefined;

const nodeEnv = typeof globalThis !== 'undefined'
  ? (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV
  : undefined;

const DEFAULT_API_URL = nodeEnv === 'production'
  ? 'https://firstmemoir-api-staging.onrender.com/api/v1'
  : 'http://localhost:3001/api/v1';

let API_URL = envApiUrl || DEFAULT_API_URL;

export const setApiUrl = (url: string) => {
  API_URL = url;
};

// Queue for pending requests while refreshing token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; req: Request }> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.resolve({ success: false, data: null, error: error.message });
    } else {
      prom.resolve(fetch(prom.req));
    }
  });
  failedQueue = [];
};

// In non-browser (Node.js/testing) environments, maintain cookies in-memory across requests
const nodeCookieJar: Record<string, string> = {};

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach in-memory session cookies in Node.js environments
  if (typeof window === 'undefined' && Object.keys(nodeCookieJar).length > 0) {
    const existingCookie = headers.get('Cookie');
    const jarCookies = Object.entries(nodeCookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
    headers.set('Cookie', existingCookie ? `${existingCookie}; ${jarCookies}` : jarCookies);
  }

  const reqOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies for auth
  };

  try {
    let response = await fetch(url, reqOptions);

    // Capture set-cookie in Node.js environments
    if (typeof window === 'undefined') {
      const setCookieHeaders = typeof (response.headers as any).getSetCookie === 'function'
        ? (response.headers as any).getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);
      for (const rawHeader of setCookieHeaders) {
        if (typeof rawHeader === 'string') {
          const cookiePart = rawHeader.split(';')[0]?.trim();
          if (cookiePart) {
            const eqIdx = cookiePart.indexOf('=');
            if (eqIdx !== -1) {
              const k = cookiePart.slice(0, eqIdx).trim();
              const v = cookiePart.slice(eqIdx + 1).trim();
              nodeCookieJar[k] = v;
            }
          }
        }
      }
    }

    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/logout') {
      if (isRefreshing) {
        return new Promise<ApiResponse<T>>((resolve) => {
          failedQueue.push({ 
            resolve: async (res) => {
              if (res instanceof Promise) {
                resolve(await handleResponse<T>(await res));
              } else {
                resolve(res as ApiResponse<T>);
              }
            }, 
            req: new Request(url, reqOptions) 
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          processQueue(null);
          // Retry the original request
          response = await fetch(url, reqOptions);
        } else {
          processQueue(new Error('Session expired'));
          return {
            success: false,
            data: null as unknown as T,
            error: 'Session expired'
          };
        }
      } catch (err) {
        processQueue(err as Error);
        return {
          success: false,
          data: null as unknown as T,
          error: err instanceof Error ? err.message : 'Session refresh failed'
        };
      } finally {
        isRefreshing = false;
      }
    }

    return handleResponse<T>(response);
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const json = await response.json();
    // Wrap raw arrays or objects that don't match ApiResponse pattern if necessary,
    // but our API should already return standard ApiResponse format.
    if (json.success !== undefined) {
      return json as ApiResponse<T>;
    }
    // Fallback if the backend sends raw JSON that isn't our custom wrapper
    return {
      success: response.ok,
      data: (response.ok ? json : null) as T | null,
      error: response.ok ? null : (json.error || json.message || 'Unknown error'),
    };
  }

  // Handle non-JSON responses
  if (!response.ok) {
    return {
      success: false,
      data: null,
      error: `HTTP error! status: ${response.status}`,
    };
  }

  return {
    success: true,
    data: null,
    error: null,
  };
}
