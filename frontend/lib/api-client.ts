export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  details?: any[];
}

export class ApiError extends Error {
  status: number;
  details?: any[];

  constructor(message: string, status: number, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Client-side helper to read cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Client-side helper to set cookie
export function setCookie(name: string, value: string, days?: number) {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
}

// Client-side helper to erase cookie
export function eraseCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Lax';
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  
  const headers = new Headers(options.headers);
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Retrieve token from cookie (shared between Client & Middleware)
  const token = getCookie('access_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    method,
    headers,
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // 401 Unauthorized: Session has timed out or token is invalid
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        eraseCookie('access_token');
        eraseCookie('refresh_token');
        eraseCookie('user_role');
        eraseCookie('is_onboarded');
        try {
          localStorage.removeItem('aerostake_user_profile');
        } catch {}
        const currentPath = window.location.pathname;
        if (
          currentPath !== '/login' &&
          currentPath !== '/signup' &&
          !currentPath.startsWith('/accept-invite')
        ) {
          window.location.href = '/login?session_expired=true';
        }
      }
    }

    // Check if error matches our unified backend envelope
    if (data && typeof data === 'object' && data.status === 'error') {
      throw new ApiError(data.message || 'API request failed', response.status, data.details);
    }
    
    // Check for standard FastAPI detail
    if (data && typeof data === 'object' && data.detail) {
      const msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      throw new ApiError(msg, response.status);
    }

    throw new ApiError(
      typeof data === 'string' ? data : `HTTP error! status: ${response.status}`,
      response.status
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: any, options?: RequestInit) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: any, options?: RequestInit) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: any, options?: RequestInit) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestInit) => request<T>('DELETE', path, undefined, options),
};
