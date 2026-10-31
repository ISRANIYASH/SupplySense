/**
 * lib/api/config.ts
 * Centralized API configuration and URL resolution for SupplySense frontend.
 */

export function getApiBaseUrl(): string {
  // 1. Check client/build-time environment variables
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. In browser environment: detect localhost vs deployed production
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocalhost) {
      return 'http://localhost:8000';
    }
    // In production on Vercel / remote domain, if NEXT_PUBLIC_API_URL is missing,
    // return '' so relative requests or same-origin rewrite can be attempted
    // rather than failing immediately with insecure mixed-content localhost:8000.
    return '';
  }

  // 3. In server-side SSR / build time:
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }

  return '';
}

export function isApiConfigured(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    if (isLocalhost) return true;
  }
  const base = getApiBaseUrl();
  return Boolean(base);
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) {
    // Relative path for same-origin proxy / rewrites
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
}

export function formatApiErrorMessage(error?: unknown): string {
  const base = getApiBaseUrl();
  const configured = isApiConfigured();

  if (typeof window !== 'undefined') {
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
    if (!configured && !isLocalhost) {
      return 'Backend API URL is not configured. Please set NEXT_PUBLIC_API_URL in your Vercel Project Settings (Environment Variables) and redeploy.';
    }
    if (isLocalhost && !base) {
      return 'Unable to connect to local SupplySense backend on port 8000. Make sure the backend server is running.';
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
      return base
        ? `Unable to connect to SupplySense API at ${base}. If using Render free-tier, the instance may be spinning up from sleep (allow 45-60s) or check CORS/network.`
        : 'Unable to connect to SupplySense API. Please check your backend status and deployment environment variables.';
    }
    return error.message;
  }

  return 'Unable to connect to SupplySense API. Please check your network and backend configuration.';
}
