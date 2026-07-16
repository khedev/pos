/**
 * SSR utility functions for server-side rendering.
 * Provides:
 * - Auth extraction from cookies
 * - Auth state management for server
 * - Header/cookie serialization helpers
 * - Server-side data fetching helpers
 */

/**
 * Extract authentication state from cookies.
 * On the server, we read cookies that were set by the client.
 * The client sends cookies with each HTTP request — we parse them here.
 *
 * @param {Object} cookies - Parsed cookie key-value pairs
 * @returns {{ user: Object|null, token: string|null, isAuthenticated: boolean }}
 */
export function getAuthFromCookies(cookies) {
  if (!cookies) {
    return { user: null, token: null, isAuthenticated: false };
  }

  const token = cookies['pgpos_token'] || null;
  const userCookie = cookies['pgpos_user'] || null;

  let user = null;
  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch {
      user = null;
    }
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
  };
}

/**
 * Serialize an object to a cookie string.
 * Used for setting auth cookies from the server.
 *
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} [options] - Cookie options
 * @returns {string} Serialized cookie header value
 */
export function serializeCookie(name, value, options = {}) {
  const {
    httpOnly = false,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    path = '/',
    maxAge = 7 * 24 * 60 * 60, // 7 days default
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (maxAge) cookie += `; Max-Age=${maxAge}`;
  if (path) cookie += `; Path=${path}`;
  if (secure) cookie += '; Secure';
  if (httpOnly) cookie += '; HttpOnly';
  if (sameSite) cookie += `; SameSite=${sameSite}`;

  return cookie;
}

/**
 * Build fetch headers with auth token for server-side API calls.
 *
 * @param {string} token - Auth token
 * @returns {Object} Headers object
 */
export function createFetchHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Create API URL for server-side requests.
 * Uses internal network when available, falls back to public URL.
 *
 * @param {string} path - API path (e.g., '/dashboard')
 * @returns {string} Full API URL
 */
export function createApiUrl(path) {
  // In Vercel, we can use the internal URL for the API
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api`
    : process.env.API_URL || 'http://localhost:5000/api';

  return `${baseUrl}${path}`;
}

/**
 * Determine render strategy for a given route.
 * Routes to different rendering methods based on content type.
 *
 * @param {string} pathname - URL pathname
 * @returns {'ssr'|'static'|'isr'}
 */
export function getRouteStrategy(pathname) {
  // Static pages — rarely change, can be pre-rendered
  const staticRoutes = [
    '/login',
    '/forgot-password',
    '/reset-password',
  ];

  // Semi-static — ISR with revalidation
  const isrRoutes = [
    '/categories',
    '/suppliers',
  ];

  if (staticRoutes.includes(pathname)) return 'static';
  if (isrRoutes.includes(pathname)) return 'isr';

  // Everything else is SSR (fresh data every time)
  return 'ssr';
}

/**
 * Extract the relative pathname from an absolute URL.
 *
 * @param {string} url - Full URL (e.g., 'https://example.com/dashboard')
 * @returns {string} Pathname (e.g., '/dashboard')
 */
export function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Check if a route requires authentication.
 *
 * @param {string} pathname - URL pathname
 * @returns {boolean}
 */
export function isProtectedRoute(pathname) {
  const publicRoutes = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/_next',
    '/__repl',
  ];
  return !publicRoutes.some(route => pathname.startsWith(route));
}