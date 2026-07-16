/**
 * Vercel Serverless Function for SSR.
 * Handles all incoming requests and renders the React app on the server.
 *
 * Architecture:
 * 1. Request comes in → Vercel edge → this serverless function
 * 2. Parse cookies for auth state
 * 3. Call the SSR render function (from dist/server/entry-server.js)
 * 4. Inject dehydrated query state and auth state into HTML (from dist/client/index.html)
 * 5. Return fully rendered HTML to the client
 *
 * IMPORTANT: This file lives at the ROOT `api/` directory because Vercel
 * requires Serverless Functions to be in the root `api/` folder.
 * The SSR build output is at `frontend/dist/server/entry-server.js`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths relative to the project root
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLIENT_DIST = path.resolve(PROJECT_ROOT, 'frontend/dist/client');
const SERVER_DIST = path.resolve(PROJECT_ROOT, 'frontend/dist/server');

let render;
let template;
let isLoaded = false;

/**
 * Load the production SSR build.
 * The SSR build outputs:
 *   - frontend/dist/client/index.html (HTML template)
 *   - frontend/dist/server/entry-server.js (SSR render function)
 */
async function loadProductionBuild() {
  try {
    // Load the server entry point
    const serverEntryPath = path.resolve(SERVER_DIST, 'entry-server.js');
    const serverEntry = await import(serverEntryPath);
    render = serverEntry.render;

    // Load the HTML template (client build output)
    template = fs.readFileSync(
      path.resolve(CLIENT_DIST, 'index.html'),
      'utf-8'
    );

    isLoaded = true;
    console.log('[SSR] Production build loaded successfully');
  } catch (error) {
    console.error('[SSR] Failed to load production build:', error.message);
    throw error;
  }
}

/**
 * Parse cookies from the request header.
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) {
      acc[key.trim()] = decodeURIComponent(val.join('='));
    }
    return acc;
  }, {});
}

/**
 * Inject serialized state into the HTML template.
 */
function injectStateIntoHTML(html, { queryState, auth, renderedHtml }) {
  // Serialize state with XSS protection
  const queryStateScript = queryState
    ? `<script>window.__INITIAL_QUERY_STATE__ = ${JSON.stringify(queryState).replace(/</g, '\\u003c')}</script>`
    : '';

  const authStateScript = auth
    ? `<script>window.__INITIAL_AUTH_STATE__ = ${JSON.stringify(auth).replace(/</g, '\\u003c')}</script>`
    : '';

  // Replace SSR content placeholder with rendered HTML
  let result = html.replace('<!--ssr-outlet-->', renderedHtml);

  // Inject state scripts before the closing body tag
  result = result.replace('</body>', `${queryStateScript}${authStateScript}</body>`);

  return result;
}

/**
 * Set Cache-Control headers based on route type.
 */
function setCachingHeaders(res, pathname, isAuthenticated) {
  if (pathname === '/login' || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
    // Public static pages — cache on CDN for 1 hour
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  } else if (isAuthenticated) {
    // Authenticated pages — do NOT cache on CDN (contains private data)
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  } else {
    // Non-authenticated pages — cache briefly
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  }
}

/**
 * Main request handler for Vercel Serverless Function.
 */
export default async function handler(req, res) {
  try {
    const url = req.url;

    // Skip API routes — they're handled by the backend
    if (url.startsWith('/api/') && !url.startsWith('/api/ssr')) {
      res.status(404).json({ error: 'API routes are handled by the backend' });
      return;
    }

    // Skip static assets (served directly by Vercel's static file serving)
    if (url.startsWith('/assets/') || url.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/)) {
      // If we get here, the file wasn't found as a static asset
      res.status(404).json({ error: 'Static asset not found' });
      return;
    }

    // Load the render function and template on first request
    if (!isLoaded) {
      await loadProductionBuild();
    }

    // Parse cookies for auth
    const cookies = parseCookies(req.headers.cookie);

    // Render the app — this runs server-side data fetching and renders to HTML
    const { html: renderedHtml, queryState, auth } = await render(url, { cookies });

    // Inject dehydrated state into HTML template
    const finalHtml = injectStateIntoHTML(template, {
      queryState,
      auth,
      renderedHtml,
    });

    // Set caching headers
    const pathname = new URL(url, 'http://localhost').pathname;
    setCachingHeaders(res, pathname, auth?.isAuthenticated);

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Send the fully rendered HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(finalHtml);
  } catch (error) {
    console.error('[SSR] Error:', error.message);

    // CSR fallback: if SSR fails, send the client-side app
    try {
      const fallbackHtml = fs.readFileSync(
        path.resolve(CLIENT_DIST, 'index.html'),
        'utf-8'
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(fallbackHtml);
      console.log('[SSR] CSR fallback sent successfully');
    } catch (fallbackError) {
      console.error('[SSR] Fallback also failed:', fallbackError.message);
      res.status(500).send('Internal Server Error');
    }
  }
}