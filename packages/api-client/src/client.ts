import type { ApiResponse } from './types';

let API_URL = 'http://localhost:3001/api/v1';

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

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const reqOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies for auth
  };

  try {
    let response = await fetch(url, reqOptions);

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
